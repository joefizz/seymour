import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
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
  const [filter, setFilter] = useState<"all" | "unread" | "saved">("all");
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

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Persist layout preferences
  useEffect(() => {
    localStorage.setItem("seymour_reader_layout", readerLayout);
  }, [readerLayout]);

  useEffect(() => {
    localStorage.setItem("seymour_split_size", String(splitSize));
  }, [splitSize]);

  const loadFeeds = useCallback(async () => {
    try {
      const data = await api.getFeeds();
      setFeeds(data);
    } catch {}
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getArticles({
        feedId: selectedFeedId,
        unread: filter === "unread",
        saved: filter === "saved",
        page,
        limit: 30,
      });
      setArticles(data.articles);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [selectedFeedId, filter, page]);

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

  const articleList = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="sticky top-0 bg-gray-50 border-b px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex gap-1">
          {(["all", "unread", "saved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={handleMarkAllRead}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Mark all read
        </button>
      </div>

      {/* Articles */}
      <div className="flex-1 overflow-y-auto divide-y">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {feeds.length === 0
              ? "Add a feed to get started"
              : "No articles found"}
          </div>
        ) : (
          articles.map((article) => (
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

      {/* Pagination */}
      {total > 30 && (
        <div className="p-4 flex justify-center gap-2 border-t shrink-0">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            Page {page}
          </span>
          <button
            disabled={page * 30 >= total}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
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
          <h1 className="text-lg font-bold">Seymour</h1>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddFeed(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Feed
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="p-1.5 text-gray-500 hover:text-gray-700"
            aria-label="Settings"
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
              className={`shrink-0 bg-gray-200 hover:bg-blue-400 transition-colors ${
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
