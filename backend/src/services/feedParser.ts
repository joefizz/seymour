import RssParser from "rss-parser";
import type { NormalizedArticle } from "../types/index.js";

const rssParser = new RssParser();

export interface ParsedFeed {
  title: string | null;
  siteUrl: string | null;
  type: "rss" | "atom" | "json";
  articles: NormalizedArticle[];
}

export async function parseFeed(url: string): Promise<ParsedFeed> {
  // Try JSON Feed first (by fetching and checking content type)
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (
    contentType.includes("application/feed+json") ||
    contentType.includes("application/json")
  ) {
    try {
      return parseJsonFeed(body);
    } catch {
      // Fall through to RSS/Atom parsing
    }
  }

  // Try to detect JSON Feed by content
  if (body.trimStart().startsWith("{")) {
    try {
      const json = JSON.parse(body);
      if (json.version?.startsWith("https://jsonfeed.org/")) {
        return parseJsonFeed(body);
      }
    } catch {
      // Not JSON, continue
    }
  }

  // Parse as RSS or Atom
  return parseRssAtom(body);
}

async function parseRssAtom(xml: string): Promise<ParsedFeed> {
  const isAtom =
    xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"");
  const type = isAtom ? "atom" : "rss";

  const feed = await rssParser.parseString(xml);
  return {
    title: feed.title || null,
    siteUrl: feed.link || null,
    type,
    articles: (feed.items || []).map((item) => ({
      guid: item.guid || item.link || item.title || "",
      title: item.title || null,
      summary: item.contentSnippet || item.summary || null,
      content: item["content:encoded"] || item.content || null,
      url: item.link || null,
      author: item.creator || item.author || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : null,
    })),
  };
}

function parseJsonFeed(body: string): ParsedFeed {
  const feed = JSON.parse(body);
  return {
    title: feed.title || null,
    siteUrl: feed.home_page_url || null,
    type: "json",
    articles: (feed.items || []).map((item: any) => ({
      guid: item.id || item.url || "",
      title: item.title || null,
      summary: item.summary || null,
      content: item.content_html || item.content_text || null,
      url: item.url || item.external_url || null,
      author: item.authors?.[0]?.name || item.author?.name || null,
      publishedAt: item.date_published ? new Date(item.date_published) : null,
    })),
  };
}
