CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  retention_days INTEGER NOT NULL DEFAULT 90,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX settings_user_id_unique ON settings(user_id);
--> statement-breakpoint
ALTER TABLE feeds ADD COLUMN last_error TEXT;
--> statement-breakpoint
ALTER TABLE feeds ADD COLUMN last_success_at TEXT;
--> statement-breakpoint
ALTER TABLE feeds ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
