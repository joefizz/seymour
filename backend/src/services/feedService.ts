import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { feeds, articles, userArticles } from "../db/schema.js";
import { parseFeed } from "./feedParser.js";

export async function addFeed(userId: number, url: string) {
  const parsed = await parseFeed(url);

  const feed = db
    .insert(feeds)
    .values({
      userId,
      url,
      title: parsed.title,
      type: parsed.type,
      siteUrl: parsed.siteUrl,
      lastFetched: new Date(),
    })
    .returning()
    .get();

  // Insert initial articles
  for (const article of parsed.articles) {
    db.insert(articles)
      .values({
        feedId: feed.id,
        guid: article.guid,
        title: article.title,
        summary: article.summary,
        content: article.content,
        url: article.url,
        author: article.author,
        publishedAt: article.publishedAt,
      })
      .onConflictDoNothing()
      .run();
  }

  return feed;
}

export function updateFeed(userId: number, feedId: number, updates: { url?: string; title?: string; contentMode?: string }) {
  const feed = db
    .select()
    .from(feeds)
    .where(and(eq(feeds.id, feedId), eq(feeds.userId, userId)))
    .get();

  if (!feed) throw new Error("Feed not found");

  const set: Record<string, string> = {};
  if (updates.url) set.url = updates.url;
  if (updates.title) set.title = updates.title;
  if (updates.contentMode) set.contentMode = updates.contentMode;

  if (Object.keys(set).length > 0) {
    db.update(feeds).set(set).where(eq(feeds.id, feedId)).run();
  }

  return db.select().from(feeds).where(eq(feeds.id, feedId)).get();
}

export function removeFeed(userId: number, feedId: number) {
  const feed = db
    .select()
    .from(feeds)
    .where(and(eq(feeds.id, feedId), eq(feeds.userId, userId)))
    .get();

  if (!feed) throw new Error("Feed not found");

  db.delete(feeds).where(eq(feeds.id, feedId)).run();
  return { success: true };
}

export function listFeeds(userId: number) {
  const userFeeds = db
    .select()
    .from(feeds)
    .where(eq(feeds.userId, userId))
    .all();

  return userFeeds.map((feed) => {
    const totalArticles = db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.feedId, feed.id))
      .get();

    const readArticles = db
      .select({ count: sql<number>`count(*)` })
      .from(userArticles)
      .innerJoin(articles, eq(userArticles.articleId, articles.id))
      .where(
        and(
          eq(userArticles.userId, userId),
          eq(articles.feedId, feed.id),
          eq(userArticles.read, true)
        )
      )
      .get();

    return {
      ...feed,
      articleCount: totalArticles?.count || 0,
      unreadCount: (totalArticles?.count || 0) - (readArticles?.count || 0),
    };
  });
}

export async function refreshFeed(feedId: number) {
  const feed = db.select().from(feeds).where(eq(feeds.id, feedId)).get();
  if (!feed) throw new Error("Feed not found");

  try {
    const parsed = await parseFeed(feed.url);
    let newCount = 0;

    for (const article of parsed.articles) {
      const result = db
        .insert(articles)
        .values({
          feedId: feed.id,
          guid: article.guid,
          title: article.title,
          summary: article.summary,
          content: article.content,
          url: article.url,
          author: article.author,
          publishedAt: article.publishedAt,
        })
        .onConflictDoNothing()
        .run();

      if (result.changes > 0) newCount++;
    }

    // Update title if it changed
    if (parsed.title && parsed.title !== feed.title) {
      db.update(feeds).set({ title: parsed.title }).where(eq(feeds.id, feedId)).run();
    }

    db.update(feeds)
      .set({
        lastFetched: new Date(),
        lastError: null,
        lastSuccessAt: new Date().toISOString(),
        consecutiveFailures: 0,
      })
      .where(eq(feeds.id, feedId))
      .run();

    return { newArticles: newCount };
  } catch (error: any) {
    db.update(feeds)
      .set({
        lastError: error.message,
        consecutiveFailures: (feed.consecutiveFailures ?? 0) + 1,
      })
      .where(eq(feeds.id, feedId))
      .run();
    throw error;
  }
}
