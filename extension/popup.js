const statusEl = document.getElementById("status");
const articlesEl = document.getElementById("articles");
const countBadge = document.getElementById("count-badge");
const settingsBtn = document.getElementById("settings-btn");

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
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

async function render() {
  const data = await chrome.storage.local.get(["backendUrl", "token", "webAppUrl", "cachedArticles", "unreadCount"]);

  if (!data.backendUrl || !data.token) {
    statusEl.innerHTML = 'Not connected. <a id="open-settings">Open settings</a> to log in.';
    document.getElementById("open-settings").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  const articles = data.cachedArticles || [];
  const count = data.unreadCount || 0;
  const webAppUrl = (data.webAppUrl || data.backendUrl).replace(/\/+$/, "");

  if (count > 0) {
    countBadge.textContent = count > 999 ? "999+" : count;
    countBadge.style.display = "";
  }

  if (articles.length === 0) {
    statusEl.textContent = "No unread articles.";
    return;
  }

  statusEl.style.display = "none";

  articles.forEach((article) => {
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

    a.addEventListener("click", () => {
      // Close popup after click
      setTimeout(() => window.close(), 100);
    });

    articlesEl.appendChild(a);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Render immediately from cache, then trigger a fresh poll
render();
chrome.runtime.sendMessage({ type: "poll" });

// Re-render if storage updates while popup is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes.cachedArticles || changes.unreadCount) {
    articlesEl.innerHTML = "";
    statusEl.style.display = "";
    statusEl.textContent = "";
    countBadge.style.display = "none";
    render();
  }
});
