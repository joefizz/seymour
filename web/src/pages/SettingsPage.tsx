import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../lib/api";

export function SettingsPage() {
  const navigate = useNavigate();
  const [retentionDays, setRetentionDays] = useState(90);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    api.getSettings().then((s) => setRetentionDays(s.retentionDays)).catch(() => {});
  }, []);

  async function handleSaveRetention() {
    setSaving(true);
    try {
      await api.updateSettings({ retentionDays });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  async function handleExportOpml() {
    try {
      const blob = await api.exportOpml();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seymour-feeds.opml";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleImportOpml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await api.importOpml(text);
      setImportResult(`Imported ${result.imported} of ${result.total} feeds`);
    } catch (err: any) {
      setImportResult(`Error: ${err.message}`);
    }
    setImporting(false);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-lg font-bold dark:text-gray-100">Settings</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Article Retention */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-1 dark:text-gray-100">Article Retention</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Automatically remove articles older than this. Saved articles are never removed.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value) || 90)}
              className="w-20 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">days</span>
            <button
              onClick={handleSaveRetention}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saved ? "Saved!" : saving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        {/* OPML Import/Export */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-1 dark:text-gray-100">Import / Export</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Import or export your feeds as OPML for backup or migration.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportOpml}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600"
            >
              Export OPML
            </button>
            <label className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 cursor-pointer">
              {importing ? "Importing..." : "Import OPML"}
              <input
                type="file"
                accept=".opml,.xml"
                onChange={handleImportOpml}
                className="hidden"
                disabled={importing}
              />
            </label>
          </div>
          {importResult && (
            <p className={`mt-2 text-sm ${importResult.startsWith("Error") ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
              {importResult}
            </p>
          )}
        </section>

        {/* Change Password */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-1 dark:text-gray-100">Change Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Enter your current password and choose a new one.
          </p>
          <div className="space-y-3 max-w-xs">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <button
              onClick={async () => {
                if (!currentPassword || !newPassword) return;
                if (newPassword.length < 6) {
                  setPasswordResult({ message: "New password must be at least 6 characters", error: true });
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPasswordResult({ message: "New passwords do not match", error: true });
                  return;
                }
                setChangingPassword(true);
                setPasswordResult(null);
                try {
                  await api.changePassword(currentPassword, newPassword);
                  setPasswordResult({ message: "Password changed", error: false });
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                } catch (err: any) {
                  setPasswordResult({ message: err.message || "Failed to change password", error: true });
                }
                setChangingPassword(false);
              }}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
          {passwordResult && (
            <p className={`mt-2 text-sm ${passwordResult.error ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
              {passwordResult.message}
            </p>
          )}
        </section>

        {/* Account */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3 dark:text-gray-100">Account</h2>
          <button
            onClick={() => { clearToken(); navigate("/login"); }}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  );
}
