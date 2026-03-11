const ALARM_NAME = "seymour-poll";
const POLL_INTERVAL_MINUTES = 2;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES });
  poll();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES });
  poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    poll();
  }
});

async function getConfig() {
  const data = await chrome.storage.local.get(["backendUrl", "token"]);
  return { backendUrl: data.backendUrl, token: data.token };
}

async function apiFetch(path) {
  const { backendUrl, token } = await getConfig();
  if (!backendUrl || !token) return null;

  const res = await fetch(`${backendUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    // Token expired or invalid
    await chrome.storage.local.remove("token");
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
    return null;
  }

  if (!res.ok) return null;
  return res.json();
}

async function poll() {
  // Fetch unread count
  const countData = await apiFetch("/api/articles/unread-count");
  if (countData === null) return;

  const count = countData.count || 0;
  chrome.action.setBadgeText({ text: count > 0 ? String(count > 999 ? "999+" : count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });

  // Fetch unread articles for popup
  const articlesData = await apiFetch("/api/articles?unread=true&limit=50");
  if (articlesData === null) return;

  // Sort oldest first
  const articles = (articlesData.articles || []).sort((a, b) => {
    const dateA = a.publishedAt || a.createdAt || 0;
    const dateB = b.publishedAt || b.createdAt || 0;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  await chrome.storage.local.set({ cachedArticles: articles, unreadCount: count });
}

// Listen for messages from popup/options to trigger refresh
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "poll") {
    poll().then(() => sendResponse({ ok: true }));
    return true;
  }
});
