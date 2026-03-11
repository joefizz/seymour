import * as cheerio from "cheerio";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.js";
import { feeds, articles, pageMonitorConfig } from "../db/schema.js";

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function addMonitor(
  userId: number,
  url: string,
  cssSelector: string,
  checkInterval: number = 3600
) {
  const feed = db
    .insert(feeds)
    .values({
      userId,
      url,
      title: `Monitor: ${new URL(url).hostname}`,
      type: "page-monitor",
      siteUrl: url,
    })
    .returning()
    .get();

  db.insert(pageMonitorConfig)
    .values({
      feedId: feed.id,
      cssSelector,
      checkInterval,
    })
    .run();

  return { feed, config: { cssSelector, checkInterval } };
}

export function updateMonitor(
  userId: number,
  feedId: number,
  cssSelector?: string,
  checkInterval?: number
) {
  // Verify ownership
  const feed = db
    .select()
    .from(feeds)
    .where(and(eq(feeds.id, feedId), eq(feeds.userId, userId)))
    .get();
  if (!feed) throw new Error("Monitor not found");

  const updates: Record<string, any> = {};
  if (cssSelector !== undefined) updates.cssSelector = cssSelector;
  if (checkInterval !== undefined) updates.checkInterval = checkInterval;

  if (Object.keys(updates).length > 0) {
    db.update(pageMonitorConfig)
      .set(updates)
      .where(eq(pageMonitorConfig.feedId, feedId))
      .run();
  }

  return { success: true };
}

export function removeMonitor(userId: number, feedId: number) {
  const feed = db
    .select()
    .from(feeds)
    .where(
      and(
        eq(feeds.id, feedId),
        eq(feeds.userId, userId),
        eq(feeds.type, "page-monitor")
      )
    )
    .get();
  if (!feed) throw new Error("Monitor not found");

  db.delete(feeds).where(eq(feeds.id, feedId)).run();
  return { success: true };
}

export async function checkForChanges(feedId: number): Promise<number> {
  const feed = db.select().from(feeds).where(eq(feeds.id, feedId)).get();
  if (!feed) throw new Error("Feed not found");

  const monitorConfig = db
    .select()
    .from(pageMonitorConfig)
    .where(eq(pageMonitorConfig.feedId, feedId))
    .get();
  if (!monitorConfig) throw new Error("Monitor config not found");

  const response = await fetch(feed.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Seymour/1.0; +https://github.com/seymour)",
    },
  });
  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract content from the selected region
  const selectedContent = $(monitorConfig.cssSelector).html() || "";
  const currentHash = hashContent(selectedContent);

  if (currentHash === monitorConfig.lastContentHash) {
    // No changes
    db.update(feeds)
      .set({ lastFetched: new Date() })
      .where(eq(feeds.id, feedId))
      .run();
    return 0;
  }

  // Extract links from the selected region
  const links: { url: string; title: string }[] = [];
  $(monitorConfig.cssSelector)
    .find("a[href]")
    .each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (href && title) {
        const absoluteUrl = new URL(href, feed.url).toString();
        links.push({ url: absoluteUrl, title });
      }
    });

  // Insert new articles
  let newCount = 0;
  for (const link of links) {
    const result = db
      .insert(articles)
      .values({
        feedId,
        guid: link.url,
        title: link.title,
        url: link.url,
        publishedAt: new Date(),
      })
      .onConflictDoNothing()
      .run();
    if (result.changes > 0) newCount++;
  }

  // Update hash and last fetched
  db.update(pageMonitorConfig)
    .set({ lastContentHash: currentHash })
    .where(eq(pageMonitorConfig.feedId, feedId))
    .run();
  db.update(feeds)
    .set({ lastFetched: new Date() })
    .where(eq(feeds.id, feedId))
    .run();

  return newCount;
}
