const statusEl = document.getElementById("status");
const articlesEl = document.getElementById("articles");
const countBadge = document.getElementById("count-badge");
const markAllBtn = document.getElementById("mark-all-btn");
const settingsBtn = document.getElementById("settings-btn");

const MAX_POPUP_ARTICLES = 20;
let currentArticles = [];

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

markAllBtn.addEventListener("click", async () => {
  if (currentArticles.length === 0) return;
  markAllBtn.disabled = true;
  markAllBtn.textContent = "Marking...";

  const data = await chrome.storage.local.get(["backendUrl", "token"]);
  if (data.backendUrl && data.token) {
    const articleIds = currentArticles.map((a) => a.id);
    try {
      await fetch(`${data.backendUrl}/api/articles/mark-batch-read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articleIds }),
      });
      // Trigger a fresh poll to update badge and cache
      chrome.runtime.sendMessage({ type: "poll" });
      currentArticles = [];
      articlesEl.innerHTML = "";
      countBadge.style.display = "none";
      markAllBtn.style.display = "none";
      statusEl.style.display = "";
      statusEl.textContent = "No unread articles.";
    } catch {
      markAllBtn.textContent = "Mark all read";
      markAllBtn.disabled = false;
    }
  }
});

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderArticles(articles, count, webAppUrl) {
  articlesEl.innerHTML = "";
  statusEl.style.display = "";
  statusEl.textContent = "";
  countBadge.style.display = "none";
  markAllBtn.style.display = "none";

  // Limit to max popup articles
  const visible = articles.slice(0, MAX_POPUP_ARTICLES);
  currentArticles = visible;

  if (count > 0) {
    countBadge.textContent = count > 999 ? "999+" : count;
    countBadge.style.display = "";
  }

  if (visible.length === 0) {
    statusEl.textContent = "No unread articles.";
    return;
  }

  statusEl.style.display = "none";
  markAllBtn.style.display = "";
  markAllBtn.disabled = false;
  markAllBtn.textContent = "Mark all read";

  visible.forEach((article) => {
    const a = document.createElement("a");
    a.className = "article";
    a.href = `${webAppUrl}/#/article/${article.id}`;
    a.target = "_blank";
    a.rel = "noopener";

    a.innerHTML = `
      <div class="unread-dot"></div>
      <div class="article-body">
        <div class="article-meta">
          <span>${article.feedTitle || ""}</span>
          <span>${timeAgo(article.publishedAt)}</span>
        </div>
        <div class="article-title">${escapeHtml(article.title || "Untitled")}</div>
      </div>
    `;

    a.addEventListener("click", async () => {
      // Mark as read via API
      const data = await chrome.storage.local.get(["backendUrl", "token"]);
      if (data.backendUrl && data.token) {
        fetch(`${data.backendUrl}/api/articles/${article.id}/read`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${data.token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {});
      }
      setTimeout(() => window.close(), 100);
    });

    articlesEl.appendChild(a);
  });
}

async function init() {
  const data = await chrome.storage.local.get(["backendUrl", "token", "webAppUrl", "cachedArticles", "unreadCount"]);

  if (!data.backendUrl || !data.token) {
    statusEl.innerHTML = 'Not connected. <a id="open-settings">Open settings</a> to log in.';
    document.getElementById("open-settings").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  const webAppUrl = (data.webAppUrl || data.backendUrl).replace(/\/+$/, "");

  // Show cache immediately as a placeholder
  const cachedArticles = data.cachedArticles || [];
  const cachedCount = data.unreadCount || 0;
  renderArticles(cachedArticles, cachedCount, webAppUrl);

  // Then fetch fresh data and re-render
  try {
    const response = await chrome.runtime.sendMessage({ type: "poll" });
    if (response && response.ok) {
      const fresh = await chrome.storage.local.get(["cachedArticles", "unreadCount"]);
      renderArticles(fresh.cachedArticles || [], fresh.unreadCount || 0, webAppUrl);
    }
  } catch {
    // Background poll failed, cache is already shown
  }
}

init();

// Re-render if storage updates while popup is open (e.g. from alarm poll)
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.cachedArticles || changes.unreadCount) {
    const data = await chrome.storage.local.get(["backendUrl", "webAppUrl", "cachedArticles", "unreadCount"]);
    const webAppUrl = (data.webAppUrl || data.backendUrl || "").replace(/\/+$/, "");
    renderArticles(data.cachedArticles || [], data.unreadCount || 0, webAppUrl);
  }
});
