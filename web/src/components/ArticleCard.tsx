import { useRef, useState, useCallback } from "react";

interface ArticleCardProps {
  article: any;
  active?: boolean;
  onClick: () => void;
  onToggleSaved: () => void;
  onMarkRead?: () => void;
}

function timeAgo(date: string | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const SWIPE_THRESHOLD = 80;

export function ArticleCard({ article, active, onClick, onToggleSaved, onMarkRead }: ArticleCardProps) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwiping(false);
    setSwipeX(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // If vertical scroll is dominant, don't swipe
    if (!swiping && Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) > 10) {
      setSwiping(true);
    }

    if (swiping) {
      setSwipeX(dx);
    }
  }, [swiping]);

  const onTouchEnd = useCallback(() => {
    if (!swiping) return;

    if (swipeX < -SWIPE_THRESHOLD && onMarkRead && !article.read) {
      // Swipe left → mark read
      setSwipeX(0);
      setSwiping(false);
      onMarkRead();
    } else if (swipeX > SWIPE_THRESHOLD) {
      // Swipe right → toggle saved
      setSwipeX(0);
      setSwiping(false);
      onToggleSaved();
    } else {
      setSwipeX(0);
      setSwiping(false);
    }
  }, [swiping, swipeX, onMarkRead, onToggleSaved, article.read]);

  // Determine which action indicator to show
  const showMarkRead = swipeX < -30;
  const showBookmark = swipeX > 30;

  return (
    <div className="relative overflow-hidden">
      {/* Background action indicators */}
      {swiping && (
        <>
          {/* Left swipe - mark read (revealed on right side) */}
          <div
            className={`absolute inset-y-0 right-0 flex items-center justify-end px-4 transition-colors ${
              swipeX < -SWIPE_THRESHOLD ? "bg-green-500" : "bg-green-400/60"
            }`}
            style={{ width: Math.max(0, -swipeX) }}
          >
            {showMarkRead && (
              <div className="text-white flex items-center gap-1.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium">Read</span>
              </div>
            )}
          </div>

          {/* Right swipe - bookmark (revealed on left side) */}
          <div
            className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 transition-colors ${
              swipeX > SWIPE_THRESHOLD ? "bg-yellow-500" : "bg-yellow-400/60"
            }`}
            style={{ width: Math.max(0, swipeX) }}
          >
            {showBookmark && (
              <div className="text-white flex items-center gap-1.5">
                <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="text-xs font-medium">{article.saved ? "Unsave" : "Save"}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Swipeable article content */}
      <div
        className={`relative ${
          active ? "bg-blue-50 border-l-2 border-l-blue-600 dark:bg-blue-900/20" : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
        } ${article.read && !active ? "opacity-60" : ""} px-4 py-3 cursor-pointer flex gap-3`}
        style={{
          transform: swiping ? `translateX(${swipeX}px)` : "translateX(0)",
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
        onClick={swiping ? undefined : onClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {!article.read && (
              <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {article.feedTitle}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-400">
              {timeAgo(article.publishedAt)}
            </span>
          </div>
          <h3 className="text-sm font-medium leading-snug line-clamp-2 dark:text-gray-100">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {article.summary}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSaved();
          }}
          className={`shrink-0 self-start p-1 ${
            article.saved ? "text-yellow-500" : "text-gray-300 hover:text-gray-400 dark:text-gray-500"
          }`}
          aria-label={article.saved ? "Unsave" : "Save"}
        >
          <svg className="w-4 h-4" fill={article.saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
