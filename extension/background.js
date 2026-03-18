const ALARM_NAME = "seymour-poll";
const REFRESH_ALARM_NAME = "seymour-token-refresh";
const POLL_INTERVAL_MINUTES = 2;
const TOKEN_REFRESH_INTERVAL_MINUTES = 60 * 24; // Refresh token daily

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES });
  chrome.alarms.create(REFRESH_ALARM_NAME, { periodInMinutes: TOKEN_REFRESH_INTERVAL_MINUTES });
  poll();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES });
  chrome.alarms.create(REFRESH_ALARM_NAME, { periodInMinutes: TOKEN_REFRESH_INTERVAL_MINUTES });
  poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    poll();
  } else if (alarm.name === REFRESH_ALARM_NAME) {
    refreshToken();
  }
});

async function getConfig() {
  const data = await chrome.storage.local.get(["backendUrl", "token"]);
  return { backendUrl: data.backendUrl, token: data.token };
}

async function refreshToken() {
  const { backendUrl, token } = await getConfig();
  if (!backendUrl || !token) return false;

  try {
    const res = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        await chrome.storage.local.remove("token");
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
      }
      return false;
    }

    const data = await res.json();
    await chrome.storage.local.set({ token: data.token });
    return true;
  } catch {
    return false;
  }
}

async function apiFetch(path, options = {}) {
  const { backendUrl, token } = await getConfig();
  if (!backendUrl || !token) return null;

  const res = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // Try refreshing the token and retry once
    const refreshed = await refreshToken();
    if (refreshed) {
      const { token: newToken } = await getConfig();
      const retry = await fetch(`${backendUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      if (retry.ok) return retry.json();
    }
    // Refresh failed — token is already cleared by refreshToken()
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
