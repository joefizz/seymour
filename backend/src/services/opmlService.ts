import { db } from "../db/connection.js";
import { feeds } from "../db/schema.js";
import { eq } from "drizzle-orm";

export function exportOpml(userId: number): string {
  const userFeeds = db.select().from(feeds).where(eq(feeds.userId, userId)).all();

  const outlines = userFeeds
    .map(f => `      <outline type="rss" text="${escapeXml(f.title || f.url)}" title="${escapeXml(f.title || f.url)}" xmlUrl="${escapeXml(f.url)}" />`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Seymour Feed Export</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    <outline text="Feeds" title="Feeds">
${outlines}
    </outline>
  </body>
</opml>`;
}

export function parseOpml(xml: string): string[] {
  const urls: string[] = [];
  const regex = /xmlUrl=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  }
  return urls;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
