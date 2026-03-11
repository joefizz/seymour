import cron from "node-cron";
import { sql, eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { feeds, pageMonitorConfig } from "../db/schema.js";
import { refreshFeed } from "./feedService.js";
import { checkForChanges } from "./pageMonitorService.js";

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
    } catch (err) {
      console.error("[scheduler] Error in scheduler tick:", err);
    }
  });

  console.log("[scheduler] Started - checking feeds every minute");
}
