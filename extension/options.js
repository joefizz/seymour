const backendUrlInput = document.getElementById("backend-url");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const loginStatus = document.getElementById("login-status");
const loginState = document.getElementById("login-state");
const connectedState = document.getElementById("connected-state");
const connectedEmail = document.getElementById("connected-email");
const currentUrls = document.getElementById("current-urls");
const logoutBtn = document.getElementById("logout-btn");
const refreshBtn = document.getElementById("refresh-btn");
const refreshStatus = document.getElementById("refresh-status");

async function loadState() {
  const data = await chrome.storage.local.get(["backendUrl", "token", "userEmail"]);

  if (data.token && data.backendUrl) {
    loginState.classList.add("hidden");
    connectedState.classList.remove("hidden");
    connectedEmail.textContent = data.userEmail || "unknown";
    currentUrls.textContent = data.backendUrl;
  } else {
    loginState.classList.remove("hidden");
    connectedState.classList.add("hidden");
    if (data.backendUrl) backendUrlInput.value = data.backendUrl;
  }
}

loginBtn.addEventListener("click", async () => {
  const backendUrl = backendUrlInput.value.replace(/\/+$/, "");
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!backendUrl || !email || !password) {
    showStatus(loginStatus, "Please fill in all fields.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Connecting...";

  try {
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, client: "extension" }),
    });

    if (!res.ok) {
      let body = {};
      try { body = await res.json(); } catch {}
      const detail = body.details?.map((d) => d.message).join(", ");
      throw new Error(body.error || detail || `Login failed (${res.status})`);
    }

    const data = await res.json();

    await chrome.storage.local.set({
      backendUrl,
      webAppUrl: backendUrl,
      token: data.token,
      userEmail: data.user?.email || email,
    });

    // Trigger initial poll
    chrome.runtime.sendMessage({ type: "poll" });

    showStatus(loginStatus, "Connected!", "success");
    passwordInput.value = "";
    setTimeout(loadState, 500);
  } catch (err) {
    const msg = err.message.includes("fetch")
      ? `Cannot reach ${backendUrl} — check the URL and ensure the server is running`
      : err.message;
    showStatus(loginStatus, msg, "error");
  }

  loginBtn.disabled = false;
  loginBtn.textContent = "Connect";
});

logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "userEmail", "cachedArticles", "unreadCount"]);
  chrome.action.setBadgeText({ text: "" });
  loadState();
});

refreshBtn.addEventListener("click", () => {
  refreshBtn.disabled = true;
  chrome.runtime.sendMessage({ type: "poll" }, () => {
    showStatus(refreshStatus, "Refreshed!", "success");
    refreshBtn.disabled = false;
  });
});

// Allow enter to submit login
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

function showStatus(el, message, type) {
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

loadState();
