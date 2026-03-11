import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../lib/api";
import { ArticleCard } from "../components/ArticleCard";
import { Sidebar } from "../components/Sidebar";
import { AddFeedModal } from "../components/AddFeedModal";
import { ReaderPane } from "../components/ReaderPane";

type Layout = "right" | "bottom";

export function FeedPage() {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<number | undefined>();
  const [filter, setFilter] = useState<"all" | "unread" | "saved">("unread");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">(() => {
    return (localStorage.getItem("seymour_sort_order") as "newest" | "oldest") || "newest";
  });
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Reader pane state
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [readerLayout, setReaderLayout] = useState<Layout>(() => {
    return (localStorage.getItem("seymour_reader_layout") as Layout) || "right";
  });
  const [splitSize, setSplitSize] = useState(() => {
    return parseInt(localStorage.getItem("seymour_split_size") || "50", 10);
  });

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("seymour_dark_mode") === "true";
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Persist layout preferences
  useEffect(() => {
    localStorage.setItem("seymour_reader_layout", readerLayout);
  }, [readerLayout]);

  useEffect(() => {
    localStorage.setItem("seymour_split_size", String(splitSize));
  }, [splitSize]);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("seymour_dark_mode", String(darkMode));
  }, [darkMode]);

  const loadFeeds = useCallback(async () => {
    try {
      const data = await api.getFeeds();
      setFeeds(data);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("seymour_sort_order", sortOrder);
  }, [sortOrder]);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getArticles({
        feedId: selectedFeedId,
        unread: filter === "unread",
        saved: filter === "saved",
        page,
        limit: 30,
        sort: sortOrder,
      });
      setArticles(data.articles);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [selectedFeedId, filter, page, sortOrder]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await api.getUnreadCount();
      setUnreadCount(data.count);
    } catch {}
  }, []);

  useEffect(() => {
    loadFeeds();
    loadUnreadCount();
  }, [loadFeeds, loadUnreadCount]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  async function handleMarkAllRead() {
    await api.markAllRead(selectedFeedId);
    loadArticles();
    loadFeeds();
    loadUnreadCount();
  }

  async function handleDeleteFeed(id: number) {
    await api.deleteFeed(id);
    if (selectedFeedId === id) setSelectedFeedId(undefined);
    loadFeeds();
    loadArticles();
  }

  async function handleRefreshFeed(id: number) {
    await api.refreshFeed(id);
    loadArticles();
    loadFeeds();
    loadUnreadCount();
  }

  function handleArticleClick(article: any) {
    api.markRead(article.id);
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, read: true } : a))
    );
    setSelectedArticleId(article.id);
    loadUnreadCount();
  }

  // Search handlers
  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.search(searchQuery.trim());
      setSearchResults(data.articles);
    } catch {}
    setSearching(false);
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  // Drag-to-resize handler
  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;

    const container = splitContainerRef.current;
    if (!container) return;

    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !container) return;
      const rect = container.getBoundingClientRect();

      let pct: number;
      if (readerLayout === "right") {
        pct = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        pct = ((e.clientY - rect.top) / rect.height) * 100;
      }
      setSplitSize(Math.max(20, Math.min(80, pct)));
    }

    function onMouseUp() {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    document.body.style.userSelect = "none";
    document.body.style.cursor = readerLayout === "right" ? "col-resize" : "row-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  const displayArticles = searchResults !== null ? searchResults : articles;

  const articleList = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search results header or filter bar */}
      {searchResults !== null ? (
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &lsquo;{searchQuery}&rsquo;
          </span>
          <button
            onClick={clearSearch}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex gap-1">
            {(["all", "unread", "saved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1 text-sm rounded-full ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(s => s === "newest" ? "oldest" : "newest")}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
              title={`Sort by ${sortOrder === "newest" ? "oldest" : "newest"} first`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sortOrder === "newest" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m0 0l4 4m-4-4l4-4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m0 0l-4 4m4-4l-4-4" />
                )}
              </svg>
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </button>
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Mark all read
            </button>
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
        {(searching || loading) ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">{searching ? "Searching..." : "Loading..."}</div>
        ) : displayArticles.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            {searchResults !== null
              ? "No articles match your search"
              : feeds.length === 0
              ? "Add a feed to get started"
              : "No articles found"}
          </div>
        ) : (
          displayArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              active={article.id === selectedArticleId}
              onClick={() => handleArticleClick(article)}
              onToggleSaved={async () => {
                await api.toggleSaved(article.id);
                loadArticles();
              }}
            />
          ))
        )}
      </div>

      {/* Pagination (only when not showing search results) */}
      {searchResults === null && total > 30 && (
        <div className="p-4 flex justify-center gap-2 border-t dark:border-gray-700 shrink-0">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            Page {page}
          </span>
          <button
            disabled={page * 30 >= total}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-1"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/logo.svg" alt="Seymour" className="w-7 h-7" />
          <h1 className="text-lg font-bold dark:text-gray-100">Seymour</h1>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) handleSearch();
                if (e.key === "Escape") clearSearch();
              }}
              placeholder="Search articles..."
              className="w-full pl-9 pr-8 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddFeed(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Feed
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Settings"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          feeds={feeds}
          selectedFeedId={selectedFeedId}
          show={showSidebar}
          onSelectFeed={(id) => {
            setSelectedFeedId(id);
            setPage(1);
            setShowSidebar(false);
          }}
          onDeleteFeed={handleDeleteFeed}
          onRefreshFeed={handleRefreshFeed}
          onFeedUpdated={loadFeeds}
          onClose={() => setShowSidebar(false)}
        />

        {/* Main content area with optional reader pane */}
        {selectedArticleId === null ? (
          <main className="flex-1 overflow-hidden">
            {articleList}
          </main>
        ) : (
          <div
            ref={splitContainerRef}
            className={`flex-1 flex overflow-hidden ${
              readerLayout === "bottom" ? "flex-col" : "flex-row"
            }`}
          >
            {/* Article list */}
            <div
              className="overflow-hidden"
              style={
                readerLayout === "right"
                  ? { width: `${splitSize}%` }
                  : { height: `${splitSize}%` }
              }
            >
              {articleList}
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={startResize}
              className={`shrink-0 bg-gray-200 hover:bg-blue-400 dark:bg-gray-600 dark:hover:bg-blue-500 transition-colors ${
                readerLayout === "right"
                  ? "w-1 cursor-col-resize"
                  : "h-1 cursor-row-resize"
              }`}
            />

            {/* Reader pane */}
            <div className="flex-1 overflow-hidden min-w-0 min-h-0">
              <ReaderPane
                articleId={selectedArticleId}
                layout={readerLayout}
                onToggleLayout={() =>
                  setReaderLayout((l) => (l === "right" ? "bottom" : "right"))
                }
                onClose={() => setSelectedArticleId(null)}
              />
            </div>
          </div>
        )}
      </div>

      {showAddFeed && (
        <AddFeedModal
          onClose={() => setShowAddFeed(false)}
          onAdded={() => {
            loadFeeds();
            loadArticles();
            loadUnreadCount();
            setShowAddFeed(false);
          }}
        />
      )}
    </div>
  );
}
