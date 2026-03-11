import cron from "node-cron";
import { sql, eq, and, inArray, notInArray, lt } from "drizzle-orm";
import { db } from "../db/connection.js";
import { feeds, pageMonitorConfig, settings, articles, userArticles } from "../db/schema.js";
import { refreshFeed } from "./feedService.js";
import { checkForChanges } from "./pageMonitorService.js";

let lastCleanupTime = 0;

function runArticleCleanup() {
  const now = Date.now();
  // Only run once per hour
  if (now - lastCleanupTime < 3600_000) return;
  lastCleanupTime = now;

  try {
    const allSettings = db.select().from(settings).all();
    for (const s of allSettings) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - s.retentionDays);

      // Get article IDs that are saved by this user
      const savedIds = db.select({ articleId: userArticles.articleId })
        .from(userArticles)
        .where(and(eq(userArticles.userId, s.userId), eq(userArticles.saved, true)))
        .all()
        .map(r => r.articleId);

      // Delete old articles from this user's feeds that aren't saved
      const userFeedIds = db.select({ id: feeds.id })
        .from(feeds)
        .where(eq(feeds.userId, s.userId))
        .all()
        .map(r => r.id);

      if (userFeedIds.length > 0) {
        const deleted = db.delete(articles)
          .where(and(
            inArray(articles.feedId, userFeedIds),
            lt(articles.publishedAt, cutoff),
            savedIds.length > 0 ? notInArray(articles.id, savedIds) : undefined
          ))
          .run();
        if (deleted.changes > 0) {
          console.log(`[cleanup] Removed ${deleted.changes} old articles for user ${s.userId}`);
        }
      }
    }
  } catch (err) {
    console.error("[cleanup] Error during article cleanup:", err);
  }
}

export function startScheduler() {
  // Run every minute, check which feeds need refreshing
  cron.schedule("* * * * *", async () => {
    try {
      const now = Math.floor(Date.now() / 1000);

      // Find feeds due for refresh
      const dueFeeds = db
        .select()
        .from(feeds)
        .where(
          sql`(${feeds.lastFetched} IS NULL OR (unixepoch('now') - unixepoch(${feeds.lastFetched})) > ${feeds.fetchInterval})`
        )
        .all();

      // Process in batches of 5
      const batch = dueFeeds.slice(0, 5);

      for (const feed of batch) {
        try {
          if (feed.type === "page-monitor") {
            const newCount = await checkForChanges(feed.id);
            if (newCount > 0) {
              console.log(
                `[scheduler] Page monitor "${feed.title}" found ${newCount} new articles`
              );
            }
          } else {
            const result = await refreshFeed(feed.id);
            if (result.newArticles > 0) {
              console.log(
                `[scheduler] Feed "${feed.title}" has ${result.newArticles} new articles`
              );
            }
          }
        } catch (err) {
          console.error(`[scheduler] Error refreshing feed ${feed.id}:`, err);
        }
      }
      // Run article cleanup check
      runArticleCleanup();
    } catch (err) {
      console.error("[scheduler] Error in scheduler tick:", err);
    }
  });

  console.log("[scheduler] Started - checking feeds every minute");
}
