import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface ReaderPaneProps {
  articleId: number;
  layout: "right" | "bottom";
  onToggleLayout: () => void;
  onClose: () => void;
}

export function ReaderPane({ articleId, layout, onToggleLayout, onClose }: ReaderPaneProps) {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setArticle(null);

    api.getArticle(articleId)
      .then((data) => {
        if (!cancelled) setArticle(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [articleId]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            aria-label="Close reader"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={onToggleLayout}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            aria-label={layout === "right" ? "Move pane to bottom" : "Move pane to right"}
            title={layout === "right" ? "Split bottom" : "Split right"}
          >
            {layout === "right" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4zM4 12h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4zM12 4v16" />
              </svg>
            )}
          </button>
        </div>
        {article && (
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const result = await api.toggleSaved(article.id);
                setArticle({ ...article, saved: result.saved });
              }}
              className={`p-1 rounded ${article.saved ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"}`}
              aria-label={article.saved ? "Unsave" : "Save"}
            >
              <svg className="w-5 h-5" fill={article.saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs border rounded text-gray-600 hover:bg-gray-50"
              >
                Original
              </a>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading article...</div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center text-red-600">{error}</div>
      )}
      {article && !loading && article.contentMode === "webpage" && article.url ? (
        <iframe
          src={article.url}
          className="flex-1 w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups"
          title={article.title || "Article"}
        />
      ) : article && !loading && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 max-w-2xl mx-auto">
            <div className="mb-4">
              <h1 className="text-xl font-bold mb-1">{article.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                {article.feedTitle && <span>{article.feedTitle}</span>}
                {article.author && (
                  <>
                    <span>&middot;</span>
                    <span>{article.author}</span>
                  </>
                )}
                {article.publishedAt && (
                  <>
                    <span>&middot;</span>
                    <time>{new Date(article.publishedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}</time>
                  </>
                )}
              </div>
            </div>

            {article.contentMode === "summary" ? (
              article.summary ? (
                <p className="text-gray-700 leading-relaxed">{article.summary}</p>
              ) : (
                <p className="text-gray-400 italic">No summary available.</p>
              )
            ) : article.content ? (
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : article.summary ? (
              <p className="text-gray-700 leading-relaxed">{article.summary}</p>
            ) : (
              <p className="text-gray-400 italic">
                No content available.{" "}
                {article.url && (
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    View original article
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
