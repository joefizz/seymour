const STORAGE_KEY_URL = "seymour_backend_url";
const STORAGE_KEY_TOKEN = "seymour_token";

export function getBackendUrl(): string {
  return localStorage.getItem(STORAGE_KEY_URL) || "";
}

export function setBackendUrl(url: string) {
  localStorage.setItem(STORAGE_KEY_URL, url.replace(/\/+$/, ""));
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setToken(token: string) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBackendUrl()}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.hash = "#/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    request<{ token: string; user: { id: number; email: string } }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; email: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  // Feeds
  getFeeds: () =>
    request<any[]>("/api/feeds"),

  addFeed: (url: string) =>
    request<any>("/api/feeds", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  bulkAddFeeds: (urls: string[]) =>
    request<{ results: Array<{ url: string; success: boolean; feed?: any; error?: string }> }>(
      "/api/feeds/bulk",
      { method: "POST", body: JSON.stringify({ urls }) }
    ),

  updateFeed: (id: number, updates: { url?: string; title?: string; contentMode?: string }) =>
    request<any>(`/api/feeds/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteFeed: (id: number) =>
    request<any>(`/api/feeds/${id}`, { method: "DELETE" }),

  refreshFeed: (id: number) =>
    request<any>(`/api/feeds/${id}/refresh`, { method: "POST" }),

  // Articles
  getArticles: (params: {
    feedId?: number;
    unread?: boolean;
    saved?: boolean;
    page?: number;
    limit?: number;
    sort?: "newest" | "oldest";
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.feedId) searchParams.set("feedId", String(params.feedId));
    if (params.unread) searchParams.set("unread", "true");
    if (params.saved) searchParams.set("saved", "true");
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.sort) searchParams.set("sort", params.sort);
    const qs = searchParams.toString();
    return request<{ articles: any[]; total: number; page: number; limit: number }>(
      `/api/articles${qs ? `?${qs}` : ""}`
    );
  },

  getArticle: (id: number) =>
    request<any>(`/api/articles/${id}`),

  markRead: (id: number) =>
    request<any>(`/api/articles/${id}/read`, { method: "PATCH" }),

  markAllRead: (feedId?: number) =>
    request<any>("/api/articles/mark-all-read", {
      method: "POST",
      body: JSON.stringify({ feedId }),
    }),

  markBatchRead: (articleIds: number[]) =>
    request<any>("/api/articles/mark-batch-read", {
      method: "POST",
      body: JSON.stringify({ articleIds }),
    }),

  toggleSaved: (id: number) =>
    request<any>(`/api/articles/${id}/saved`, { method: "PATCH" }),

  getUnreadCount: () =>
    request<{ count: number }>("/api/articles/unread-count"),

  // Page monitors
  addPageMonitor: (url: string, cssSelector: string, checkInterval?: number) =>
    request<any>("/api/page-monitors", {
      method: "POST",
      body: JSON.stringify({ url, cssSelector, checkInterval }),
    }),

  deletePageMonitor: (feedId: number) =>
    request<any>(`/api/page-monitors/${feedId}`, { method: "DELETE" }),

  // Search
  search: (q: string, page?: number, limit?: number) => {
    const searchParams = new URLSearchParams({ q });
    if (page) searchParams.set("page", String(page));
    if (limit) searchParams.set("limit", String(limit));
    return request<{ articles: any[]; total: number; page: number; limit: number }>(
      `/api/articles/search?${searchParams.toString()}`
    );
  },

  // Settings
  getSettings: () =>
    request<{ retentionDays: number }>("/api/settings"),

  updateSettings: (updates: { retentionDays?: number }) =>
    request<{ retentionDays: number }>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  // OPML
  exportOpml: async () => {
    const url = `${getBackendUrl()}/api/feeds/opml`;
    const token = getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },

  importOpml: (opml: string) =>
    request<{ imported: number; total: number; results: any[] }>("/api/feeds/opml", {
      method: "POST",
      body: JSON.stringify({ opml }),
    }),
};
