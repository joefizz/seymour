# Seymour

A self-hosted RSS feed reader. Supports RSS, Atom, JSON Feed, and web page monitoring. Multi-user, mobile-friendly, dark mode, with a Chrome extension for quick access.

## Install with Docker

```bash
git clone https://github.com/your-user/seymour.git
cd seymour

# Create a .env file with a secret key
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# Build and start
docker compose up -d
```

Open `http://localhost:3001` and create an account.

To rebuild after updates:

```bash
docker compose build --no-cache && docker compose up -d
```

Your data (SQLite database) is stored in a Docker volume and persists across rebuilds.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | — | **Required.** Secret key for signing JWT tokens. Use a random 32+ char string |
| `DATABASE_PATH` | `./seymour.db` | Path to SQLite database file |
| `PORT` | `3000` | Server port (inside the container) |

The default `docker-compose.yml` maps port 3001 on the host to 3000 in the container. Edit it to change.

## Features

- **Multi-format feeds** — RSS 2.0, RSS 1.0, Atom, and JSON Feed
- **Page monitoring** — Watch pages without feeds using CSS selectors, with hash-based change detection
- **Clean reader view** — Article content extracted via Mozilla Readability
- **Reader modes** — Per-feed choice of extracted content, iframe, or summary-only
- **Split reader pane** — Read articles alongside the list with a resizable, draggable divider (right or bottom layout)
- **Search** — Full-text search across article titles, summaries, and content
- **Dark mode** — Toggle between light and dark themes, persisted across sessions
- **Article retention** — Configurable per-user retention period (1–365 days), saved articles are kept forever
- **OPML import/export** — Migrate feeds to and from other readers
- **Feed health indicators** — Visual indicators for feeds with errors or consecutive failures
- **Multi-user** — JWT authentication with per-user feeds, read/saved state, and isolated content
- **Automatic polling** — Background scheduler checks feeds on configurable intervals
- **Lazy content extraction** — Full article content is only fetched when you open an article
- **Chrome extension** — Unread count badge, article list popup, mark all read, click to open in web app
- **Self-hosted** — Your data stays on your server. SQLite database, no external dependencies

## Usage

### Adding Feeds

1. Click **+ Feed** in the header
2. Paste the feed URL (RSS, Atom, or JSON Feed)
3. Click **Add** — Seymour auto-detects the format and fetches initial articles

### Page Monitors

For sites without feeds:

1. Click **+ Feed**, then switch to **Page Monitor**
2. Enter the page URL and a CSS selector targeting the area with article links
3. Click **Add** — Seymour periodically checks for new links in that region

### Reading Articles

- Click any article to open it in the split reader pane
- Articles are automatically marked as read when opened
- Drag the divider to resize the split
- Toggle between right and bottom layout with the layout icon
- Click **Original** to open the source page, or the bookmark icon to save

### Filtering and Sorting

- **All / Unread / Saved** filter tabs
- **Newest / Oldest** sort toggle
- **Mark all read** marks only the currently visible articles as read

### Editing Feeds

Hover over a feed in the sidebar and click the pencil icon to change the title, URL, or reader mode (extracted, iframe, or summary).

### Settings

Access via the gear icon in the header:

- **Article retention** — How many days to keep articles (1–365)
- **OPML import/export** — Bulk migrate feeds
- **Sign out**

## Chrome Extension

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and select the `extension/` folder
3. Click the Seymour icon → gear icon to open settings
4. Enter your server URL (e.g. `http://your-server:3001`) and log in

The badge shows your unread count (updates every 2 minutes). Click to see unread articles, mark all as read, or jump to any article in the web app.

## Resetting a Password

If you forget your password, reset it via the Docker container:

```bash
docker exec -it <container-name> node dist/reset-password.js <email> <new-password>
```

For example:

```bash
docker exec -it seymour-seymour-1 node dist/reset-password.js joe@example.com mynewpassword
```

Use `docker ps` to find your container name. For local development, use `npm run reset-password -- <email> <new-password>` from the `backend/` directory.

## Local Development

```bash
# Backend
cd backend
cp .env.example .env    # Edit JWT_SECRET
npm install
npm run dev             # http://localhost:3000

# Frontend (separate terminal)
cd web
npm install
npm run dev             # http://localhost:5173 (proxies /api to backend)
```

## License

MIT
