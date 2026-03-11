import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBackendUrl, setBackendUrl, clearToken } from "../lib/api";

export function SettingsPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(getBackendUrl());
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setBackendUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-lg font-bold">Settings</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Server</h2>
          <label className="block text-sm text-gray-600 mb-1">Backend URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </section>

        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Account</h2>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  );
}
