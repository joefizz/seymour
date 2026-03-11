import { useState } from "react";
import { api } from "../lib/api";

interface SidebarProps {
  feeds: any[];
  selectedFeedId?: number;
  show: boolean;
  onSelectFeed: (id: number | undefined) => void;
  onDeleteFeed: (id: number) => void;
  onRefreshFeed: (id: number) => void;
  onFeedUpdated: () => void;
  onClose: () => void;
}

export function Sidebar({
  feeds,
  selectedFeedId,
  show,
  onSelectFeed,
  onDeleteFeed,
  onRefreshFeed,
  onFeedUpdated,
  onClose,
}: SidebarProps) {
  const totalUnread = feeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
  const [editingFeedId, setEditingFeedId] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContentMode, setEditContentMode] = useState("extract");
  const [saving, setSaving] = useState(false);

  function startEditing(feed: any) {
    setEditingFeedId(feed.id);
    setEditUrl(feed.url);
    setEditTitle(feed.title || "");
    setEditContentMode(feed.contentMode || "extract");
  }

  async function saveEdit() {
    if (!editingFeedId) return;
    setSaving(true);
    try {
      await api.updateFeed(editingFeedId, { url: editUrl, title: editTitle || undefined, contentMode: editContentMode });
      setEditingFeedId(null);
      onFeedUpdated();
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  }

  return (
    <>
      {/* Overlay on mobile */}
      {show && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r
          transform transition-transform lg:transform-none
          ${show ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col overflow-hidden
        `}
      >
        <div className="flex-1 overflow-y-auto py-2">
          {/* All articles */}
          <button
            onClick={() => onSelectFeed(undefined)}
            className={`w-full px-4 py-2 text-left text-sm flex justify-between items-center hover:bg-gray-50 ${
              selectedFeedId === undefined ? "bg-blue-50 text-blue-600 font-medium" : ""
            }`}
          >
            <span>All articles</span>
            {totalUnread > 0 && (
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </button>

          <div className="mt-2 px-4 py-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Feeds
            </span>
          </div>

          {feeds.map((feed) => (
            <div key={feed.id}>
              <div
                className={`group px-4 py-2 text-sm flex items-center hover:bg-gray-50 cursor-pointer ${
                  selectedFeedId === feed.id ? "bg-blue-50 text-blue-600 font-medium" : ""
                }`}
                onClick={() => onSelectFeed(feed.id)}
              >
                <span className="flex-1 truncate">{feed.title || feed.url}</span>
                <div className="flex items-center gap-1">
                  {(feed.unreadCount || 0) > 0 && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {feed.unreadCount}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(feed);
                    }}
                    className="hidden group-hover:block p-0.5 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshFeed(feed.id);
                    }}
                    className="hidden group-hover:block p-0.5 text-gray-400 hover:text-gray-600"
                    title="Refresh"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this feed?")) onDeleteFeed(feed.id);
                    }}
                    className="hidden group-hover:block p-0.5 text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {editingFeedId === feed.id && (
                <div className="px-4 py-2 bg-gray-50 border-y" onClick={(e) => e.stopPropagation()}>
                  <label className="block text-xs text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded mb-2"
                    placeholder="Feed title"
                  />
                  <label className="block text-xs text-gray-500 mb-1">URL</label>
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded mb-2 font-mono text-xs"
                    placeholder="https://..."
                  />
                  <label className="block text-xs text-gray-500 mb-1">Reader mode</label>
                  <select
                    value={editContentMode}
                    onChange={(e) => setEditContentMode(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded mb-2"
                  >
                    <option value="extract">Full article (extracted)</option>
                    <option value="webpage">Full page (iframe)</option>
                    <option value="summary">Summary only</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingFeedId(null)}
                      className="px-2 py-1 text-xs text-gray-600 border rounded hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {feeds.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-400 text-center">
              No feeds yet
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
