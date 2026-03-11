# Seymour

A self-hosted feed reader that supports RSS, Atom, JSON Feed, and web page monitoring. Multi-user, mobile-friendly, and deployable with Docker.

## Features

- **Multi-format feed support** — RSS 2.0, RSS 1.0, Atom, and JSON Feed
- **Page monitoring** — Watch pages that don't provide feeds using CSS selectors. Seymour detects new articles by hashing page content and diffing on each check
- **Clean reader view** — Article content extracted via Mozilla Readability for a distraction-free reading experience
- **Multi-user** — JWT authentication with per-user feeds, read/saved state, and isolated content
- **Mobile-friendly web UI** — Responsive design with collapsible sidebar, touch-friendly controls
- **Automatic polling** — Background scheduler checks feeds on configurable intervals
- **Lazy content extraction** — Full article content is only fetched and parsed when you actually open an article, keeping polling lightweight
- **Chrome extension** — Badge shows unread count, popup lists unread articles, click to open in the web app
- **Self-hosted** — Your data stays on your server. SQLite database, no external dependencies

## Architecture

```
┌─────────────────────┐       ┌──────────────────────┐       ┌─────────┐
│   Web Frontend      │◄─JWT──►│   Backend API        │◄─────►│ SQLite  │
│   (React + Vite)    │  REST  │   (Express + TS)     │       │  (WAL)  │
└─────────────────────┘       └──────────────────────┘       └─────────┘
                                        │
                               ┌────────┴────────┐
                               │   Scheduler     │
                               │   (node-cron)   │
                               └─────────────────┘
```

### Backend (`backend/`)

| Layer | Files | Purpose |
|-------|-------|---------|
| Entry | `src/index.ts` | Express app bootstrap, middleware, route mounting |
| Config | `src/config.ts` | Environment variable loading |
| Database | `src/db/schema.ts`, `src/db/connection.ts` | Drizzle ORM schema (5 tables), SQLite connection with WAL mode, auto-migration |
| Auth | `src/middleware/auth.ts`, `src/services/authService.ts` | JWT token verification, bcrypt password hashing |
| Validation | `src/middleware/validate.ts` | Zod-based request body validation |
| Routes | `src/routes/auth.ts`, `feeds.ts`, `articles.ts`, `pageMonitor.ts` | RESTful API endpoints |
| Feed parsing | `src/services/feedParser.ts` | RSS/Atom via rss-parser, JSON Feed via manual parsing |
| Content | `src/services/contentExtractor.ts` | Mozilla Readability + linkedom for article extraction |
| Page monitor | `src/services/pageMonitorService.ts` | CSS selector-based scraping with SHA-256 hash change detection |
| Scheduler | `src/services/scheduler.ts` | node-cron job that checks feeds due for refresh every minute |

### Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password hash) |
| `feeds` | Per-user feed subscriptions (URL, type, polling interval, content mode) |
| `articles` | Feed articles, deduplicated by `(feedId, guid)` |
| `user_articles` | Per-user read/saved state for each article |
| `page_monitor_config` | CSS selector and content hash for page monitors |

### Web Frontend (`web/`)

| File | Purpose |
|------|---------|
| `src/pages/LoginPage.tsx` | Login/register with configurable backend URL |
| `src/pages/FeedPage.tsx` | Main view — sidebar, article list, and split reader pane |
| `src/pages/ArticlePage.tsx` | Standalone article view (fallback route) |
| `src/pages/SettingsPage.tsx` | Backend URL config, sign out |
| `src/components/Sidebar.tsx` | Feed list with unread counts, inline edit (URL, title, reader mode), refresh/delete |
| `src/components/ArticleCard.tsx` | Article preview card with time-ago, save button, and active highlight |
| `src/components/AddFeedModal.tsx` | Add RSS/Atom/JSON feeds or page monitors |
| `src/components/ReaderPane.tsx` | Split reader pane — renders extracted content, summary, or iframe depending on feed mode |
| `src/lib/api.ts` | API client with JWT token management |

### Chrome Extension (`extension/`)

| File | Purpose |
|------|---------|
| `manifest.json` | Manifest V3 config — permissions, icons, popup, options page, service worker |
| `background.js` | Service worker — polls unread count every 2 min, updates badge, caches articles |
| `popup.html` / `popup.js` | Popup — lists unread articles (oldest first), click to open in web app |
| `options.html` / `options.js` | Settings — backend URL, web app URL, email/password login, disconnect |
| `icons/` | PNG icons at 16/48/128px |

## Quick Start

### Docker (recommended)

```bash
# Clone the repo
git clone https://github.com/your-user/seymour.git
cd seymour

# Create a .env file with a secret key
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# Build and start
docker compose up -d
```

- Web UI: `http://localhost:8080`
- Backend API: `http://localhost:3000`

### Manual

**Prerequisites:** Node.js 22+

```bash
# Backend
cd backend
cp .env.example .env    # Edit JWT_SECRET to a random string
npm install
npm run dev             # Starts on http://localhost:3000

# Frontend (separate terminal)
cd web
npm install
npm run dev             # Starts on http://localhost:5173
```

### Chrome Extension

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and select the `extension/` folder
3. Click the Seymour extension icon, then the gear icon to open settings
4. Enter your **Backend API URL** (e.g. `http://localhost:3001`) and **Web App URL** (e.g. `http://localhost:8080`)
5. Log in with your email and password

The extension badge will show your unread count and update every 2 minutes. Click the icon to see unread articles and jump to any article in the web app.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Backend server port |
| `JWT_SECRET` | — | Secret key for signing JWT tokens. **Required.** Use a random 32+ character string |
| `DATABASE_PATH` | `./seymour.db` | Path to SQLite database file |

### Docker Compose Ports

| Service | Default Port | Description |
|---------|-------------|-------------|
| `backend` | `3000` | API server |
| `web` | `8080` | Web frontend (nginx) |

Edit `docker-compose.yml` to change port mappings.

## API Reference

All endpoints except auth require a `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ email, password }` | Create account, returns JWT |
| POST | `/api/auth/login` | `{ email, password }` | Sign in, returns JWT |

### Feeds

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/feeds` | — | List all feeds with unread counts |
| POST | `/api/feeds` | `{ url }` | Add a feed (auto-detects type) |
| POST | `/api/feeds/bulk` | `{ urls: string[] }` | Add multiple feeds (1–100), returns per-URL results |
| PATCH | `/api/feeds/:id` | `{ url?, title?, contentMode? }` | Update feed URL, title, or reader mode |
| DELETE | `/api/feeds/:id` | — | Remove a feed and its articles |
| POST | `/api/feeds/:id/refresh` | — | Manually refresh a feed |

### Articles

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| GET | `/api/articles` | `feedId`, `unread`, `saved`, `page`, `limit` | List articles (paginated) |
| GET | `/api/articles/:id` | — | Get article with full content |
| GET | `/api/articles/unread-count` | — | Get total unread count |
| PATCH | `/api/articles/:id/read` | — | Mark as read |
| POST | `/api/articles/mark-all-read` | `{ feedId? }` | Mark all as read |
| PATCH | `/api/articles/:id/saved` | — | Toggle saved/bookmarked |

### Page Monitors

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/page-monitors` | `{ url, cssSelector, checkInterval? }` | Add a page monitor |
| PUT | `/api/page-monitors/:feedId` | `{ cssSelector?, checkInterval? }` | Update monitor config |
| DELETE | `/api/page-monitors/:feedId` | — | Remove a page monitor |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Returns `{ status: "ok" }` |

## Usage Guide

### Adding a Feed

1. Click **+ Feed** in the header
2. Paste the feed URL (RSS, Atom, or JSON Feed)
3. Click **Add** — Seymour auto-detects the format and fetches initial articles

### Adding a Page Monitor

For sites without feeds:

1. Click **+ Feed**, then switch to **Page Monitor**
2. Enter the page URL (e.g. `https://news-site.com/latest`)
3. Enter a CSS selector targeting the area with article links (e.g. `.article-list`, `#headlines`)
4. Click **Add** — Seymour will periodically check for new links in that region

### Reading Articles

- Click any article to open it in the **reader pane** (split view alongside the article list)
- Articles are automatically marked as read when opened
- **Drag the divider** between the article list and reader pane to resize
- **Toggle layout** — click the layout icon in the reader toolbar to switch between right split and bottom split (preference is remembered)
- Click **Original** to visit the source page in a new tab
- Click the bookmark icon to save articles for later
- Click **X** to close the reader pane and return to the full article list

### Reader Modes (per feed)

Each feed can be configured with a reader mode via the edit button in the sidebar:

| Mode | Description |
|------|-------------|
| **Full article (extracted)** | Default. Fetches the original page and extracts clean article content using Mozilla Readability. Works for most sites. |
| **Full page (iframe)** | Loads the original webpage directly in an iframe. Useful for sites that block content extraction. Some sites may block iframe embedding. |
| **Summary only** | Shows only the summary/excerpt from the feed. No external requests are made when opening articles. |

### Editing Feeds

Hover over a feed in the sidebar and click the pencil icon to:
- Change the feed **title**
- Change the feed **URL**
- Set the **reader mode** (extracted, iframe, or summary)

### Filtering

- **All** — Every article
- **Unread** — Articles you haven't opened
- **Saved** — Bookmarked articles
- **Mark all read** — Clears unread state for the current view

## Development

```bash
# Backend type check
cd backend && npx tsc --noEmit

# Frontend type check and build
cd web && npx tsc -b && npx vite build

# Generate a new DB migration after schema changes
cd backend && npm run db:generate
```

## License

MIT
