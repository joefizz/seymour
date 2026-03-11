import { useState } from "react";
import { api } from "../lib/api";

interface AddFeedModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddFeedModal({ onClose, onAdded }: AddFeedModalProps) {
  const [mode, setMode] = useState<"feed" | "monitor">("feed");
  const [url, setUrl] = useState("");
  const [cssSelector, setCssSelector] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "feed") {
        await api.addFeed(url);
      } else {
        await api.addPageMonitor(url, cssSelector);
      }
      onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-5 shadow-lg">
        <h2 className="text-lg font-bold mb-4 dark:text-gray-100">Add Source</h2>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setMode("feed")}
            className={`flex-1 py-1.5 text-sm rounded-md ${
              mode === "feed" ? "bg-white dark:bg-gray-600 shadow font-medium dark:text-gray-100" : "dark:text-gray-300"
            }`}
          >
            RSS / Atom / JSON
          </button>
          <button
            onClick={() => setMode("monitor")}
            className={`flex-1 py-1.5 text-sm rounded-md ${
              mode === "monitor" ? "bg-white dark:bg-gray-600 shadow font-medium dark:text-gray-100" : "dark:text-gray-300"
            }`}
          >
            Page Monitor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                mode === "feed"
                  ? "https://example.com/feed.xml"
                  : "https://example.com/news"
              }
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>

          {mode === "monitor" && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">CSS Selector</label>
              <input
                type="text"
                value={cssSelector}
                onChange={(e) => setCssSelector(e.target.value)}
                placeholder=".article-list, #news-container"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                CSS selector for the area containing article links
              </p>
            </div>
          )}

          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
