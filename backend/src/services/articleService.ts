import { eq, and, desc, asc, sql, inArray, like, or } from "drizzle-orm";
import { db } from "../db/connection.js";
import { articles, userArticles, feeds } from "../db/schema.js";
import { fetchAndExtract } from "./contentExtractor.js";

interface GetArticlesOptions {
  feedId?: number;
  unreadOnly?: boolean;
  savedOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
}

export function getArticles(userId: number, options: GetArticlesOptions = {}) {
  const { feedId, unreadOnly, savedOnly, page = 1, limit = 30, sort = "newest" } = options;
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions: any[] = [];
  if (feedId) {
    conditions.push(eq(articles.feedId, feedId));
  }

  // Only show articles from feeds the user owns
  const userFeedIds = db
    .select({ id: feeds.id })
    .from(feeds)
    .where(eq(feeds.userId, userId))
    .all()
    .map((f) => f.id);

  if (userFeedIds.length === 0) {
    return { articles: [], total: 0, page, limit };
  }

  conditions.push(inArray(articles.feedId, userFeedIds));

  const query = db
    .select({
      id: articles.id,
      feedId: articles.feedId,
      guid: articles.guid,
      title: articles.title,
      summary: articles.summary,
      url: articles.url,
      author: articles.author,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      feedTitle: feeds.title,
      feedSiteUrl: feeds.siteUrl,
      read: userArticles.read,
      saved: userArticles.saved,
    })
    .from(articles)
    .innerJoin(feeds, eq(articles.feedId, feeds.id))
    .leftJoin(
      userArticles,
      and(
        eq(userArticles.articleId, articles.id),
        eq(userArticles.userId, userId)
      )
    )
    .where(and(...conditions))
    .orderBy(
      sort === "oldest" ? asc(articles.publishedAt) : desc(articles.publishedAt),
      sort === "oldest" ? asc(articles.createdAt) : desc(articles.createdAt)
    )
    .limit(limit)
    .offset(offset)
    .all();

  // Apply read/saved filters in JS since they depend on left join
  let filtered = query;
  if (unreadOnly) {
    filtered = filtered.filter((a) => !a.read);
  }
  if (savedOnly) {
    filtered = filtered.filter((a) => a.saved);
  }

  const totalResult = db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(and(...conditions))
    .get();

  return {
    articles: filtered.map((a) => ({
      ...a,
      read: a.read ?? false,
      saved: a.saved ?? false,
    })),
    total: totalResult?.count || 0,
    page,
    limit,
  };
}

export async function getArticle(userId: number, articleId: number) {
  const article = db
    .select({
      id: articles.id,
      feedId: articles.feedId,
      guid: articles.guid,
      title: articles.title,
      summary: articles.summary,
      content: articles.content,
      url: articles.url,
      author: articles.author,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      feedTitle: feeds.title,
      feedSiteUrl: feeds.siteUrl,
      contentMode: feeds.contentMode,
      read: userArticles.read,
      saved: userArticles.saved,
    })
    .from(articles)
    .innerJoin(feeds, eq(articles.feedId, feeds.id))
    .leftJoin(
      userArticles,
      and(
        eq(userArticles.articleId, articles.id),
        eq(userArticles.userId, userId)
      )
    )
    .where(and(eq(articles.id, articleId), eq(feeds.userId, userId)))
    .get();

  if (!article) throw new Error("Article not found");

  // Lazy extract full content from original URL (only in "extract" mode)
  if (article.contentMode === "extract" && article.url) {
    const contentLength = article.content?.length || 0;
    const looksIncomplete = !article.content || contentLength < 500;
    if (looksIncomplete) {
      try {
        const extracted = await fetchAndExtract(article.url);
        if (extracted.content && extracted.content.length > contentLength) {
          db.update(articles)
            .set({ content: extracted.content })
            .where(eq(articles.id, articleId))
            .run();
          article.content = extracted.content;
        }
      } catch (err) {
        console.error(`Failed to extract content for article ${articleId}:`, err);
      }
    }
  }

  return { ...article, read: article.read ?? false, saved: article.saved ?? false };
}

export function markRead(userId: number, articleId: number) {
  db.insert(userArticles)
    .values({ userId, articleId, read: true })
    .onConflictDoUpdate({
      target: [userArticles.userId, userArticles.articleId],
      set: { read: true },
    })
    .run();
}

export function markBatchRead(userId: number, articleIds: number[]) {
  for (const articleId of articleIds) {
    db.insert(userArticles)
      .values({ userId, articleId, read: true })
      .onConflictDoUpdate({
        target: [userArticles.userId, userArticles.articleId],
        set: { read: true },
      })
      .run();
  }
}

export function markAllRead(userId: number, feedId?: number) {
  const userFeedIds = feedId
    ? [feedId]
    : db
        .select({ id: feeds.id })
        .from(feeds)
        .where(eq(feeds.userId, userId))
        .all()
        .map((f) => f.id);

  if (userFeedIds.length === 0) return;

  const articleIds = db
    .select({ id: articles.id })
    .from(articles)
    .where(inArray(articles.feedId, userFeedIds))
    .all()
    .map((a) => a.id);

  for (const articleId of articleIds) {
    db.insert(userArticles)
      .values({ userId, articleId, read: true })
      .onConflictDoUpdate({
        target: [userArticles.userId, userArticles.articleId],
        set: { read: true },
      })
      .run();
  }
}

export function toggleSaved(userId: number, articleId: number) {
  const existing = db
    .select()
    .from(userArticles)
    .where(
      and(eq(userArticles.userId, userId), eq(userArticles.articleId, articleId))
    )
    .get();

  const newSaved = !(existing?.saved ?? false);

  db.insert(userArticles)
    .values({ userId, articleId, saved: newSaved })
    .onConflictDoUpdate({
      target: [userArticles.userId, userArticles.articleId],
      set: { saved: newSaved },
    })
    .run();

  return { saved: newSaved };
}

export function getUnreadCount(userId: number) {
  const userFeedIds = db
    .select({ id: feeds.id })
    .from(feeds)
    .where(eq(feeds.userId, userId))
    .all()
    .map((f) => f.id);

  if (userFeedIds.length === 0) return { count: 0 };

  const totalResult = db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(inArray(articles.feedId, userFeedIds))
    .get();

  const readResult = db
    .select({ count: sql<number>`count(*)` })
    .from(userArticles)
    .innerJoin(articles, eq(userArticles.articleId, articles.id))
    .where(
      and(
        eq(userArticles.userId, userId),
        inArray(articles.feedId, userFeedIds),
        eq(userArticles.read, true)
      )
    )
    .get();

  return {
    count: (totalResult?.count || 0) - (readResult?.count || 0),
  };
}

export function searchArticles(userId: number, query: string, page = 1, limit = 30) {
  const offset = (page - 1) * limit;
  const pattern = `%${query}%`;

  const results = db
    .select({
      id: articles.id,
      feedId: articles.feedId,
      title: articles.title,
      summary: articles.summary,
      url: articles.url,
      author: articles.author,
      publishedAt: articles.publishedAt,
      feedTitle: feeds.title,
      read: userArticles.read,
      saved: userArticles.saved,
    })
    .from(articles)
    .innerJoin(feeds, eq(articles.feedId, feeds.id))
    .leftJoin(
      userArticles,
      and(eq(userArticles.articleId, articles.id), eq(userArticles.userId, userId))
    )
    .where(
      and(
        eq(feeds.userId, userId),
        or(
          like(articles.title, pattern),
          like(articles.summary, pattern),
          like(articles.content, pattern)
        )
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .innerJoin(feeds, eq(articles.feedId, feeds.id))
    .where(
      and(
        eq(feeds.userId, userId),
        or(
          like(articles.title, pattern),
          like(articles.summary, pattern),
          like(articles.content, pattern)
        )
      )
    )
    .all();

  return {
    articles: results.map(a => ({ ...a, read: !!a.read, saved: !!a.saved })),
    total: countResult[0]?.count || 0,
    page,
    limit,
  };
}
