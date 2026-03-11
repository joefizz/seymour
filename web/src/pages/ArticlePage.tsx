import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function ArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getArticle(parseInt(id!));
        setArticle(data);
        await api.markRead(parseInt(id!));
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading article...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || "Article not found"}</p>
        <button onClick={() => navigate("/")} className="text-blue-600 hover:underline">
          Back to feed
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const result = await api.toggleSaved(article.id);
              setArticle({ ...article, saved: result.saved });
            }}
            className={`p-1.5 rounded ${article.saved ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"}`}
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
              className="px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Original
            </a>
          )}
        </div>
      </header>

      {/* Article */}
      <article className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{article.title}</h1>
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

        {article.content ? (
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
      </article>
    </div>
  );
}
