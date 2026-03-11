interface ArticleCardProps {
  article: any;
  active?: boolean;
  onClick: () => void;
  onToggleSaved: () => void;
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

export function ArticleCard({ article, active, onClick, onToggleSaved }: ArticleCardProps) {
  return (
    <div
      className={`px-4 py-3 cursor-pointer flex gap-3 ${
        active ? "bg-blue-50 border-l-2 border-l-blue-600 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"
      } ${article.read && !active ? "opacity-60" : ""}`}
      onClick={onClick}
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
  );
}
