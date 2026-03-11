import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const feeds = sqliteTable("feeds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  type: text("type", { enum: ["rss", "atom", "json", "page-monitor"] })
    .notNull()
    .default("rss"),
  contentMode: text("content_mode", { enum: ["extract", "summary", "webpage"] })
    .notNull()
    .default("extract"),
  siteUrl: text("site_url"),
  lastFetched: integer("last_fetched", { mode: "timestamp" }),
  fetchInterval: integer("fetch_interval").notNull().default(3600),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const articles = sqliteTable(
  "articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    feedId: integer("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    guid: text("guid").notNull(),
    title: text("title"),
    summary: text("summary"),
    content: text("content"),
    url: text("url"),
    author: text("author"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("articles_feed_guid_idx").on(table.feedId, table.guid)]
);

export const userArticles = sqliteTable(
  "user_articles",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    saved: integer("saved", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("user_articles_pk").on(table.userId, table.articleId)]
);

export const pageMonitorConfig = sqliteTable("page_monitor_config", {
  feedId: integer("feed_id")
    .primaryKey()
    .references(() => feeds.id, { onDelete: "cascade" }),
  cssSelector: text("css_selector").notNull(),
  checkInterval: integer("check_interval").notNull().default(3600),
  lastContentHash: text("last_content_hash"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  feeds: many(feeds),
  userArticles: many(userArticles),
}));

export const feedsRelations = relations(feeds, ({ one, many }) => ({
  user: one(users, { fields: [feeds.userId], references: [users.id] }),
  articles: many(articles),
  pageMonitorConfig: one(pageMonitorConfig, {
    fields: [feeds.id],
    references: [pageMonitorConfig.feedId],
  }),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  feed: one(feeds, { fields: [articles.feedId], references: [feeds.id] }),
  userArticles: many(userArticles),
}));

export const userArticlesRelations = relations(userArticles, ({ one }) => ({
  user: one(users, { fields: [userArticles.userId], references: [users.id] }),
  article: one(articles, {
    fields: [userArticles.articleId],
    references: [articles.id],
  }),
}));
