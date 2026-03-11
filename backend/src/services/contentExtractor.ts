import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { ExtractedContent } from "../types/index.js";

export function extractContent(html: string, url: string): ExtractedContent {
  const { document } = parseHTML(html);

  // Set the document URL for relative link resolution
  const base = document.createElement("base");
  base.setAttribute("href", url);
  document.head.appendChild(base);

  const reader = new Readability(document as any);
  const article = reader.parse();

  if (!article) {
    return { title: null, content: null, textContent: null, excerpt: null };
  }

  return {
    title: article.title,
    content: article.content,
    textContent: article.textContent,
    excerpt: article.excerpt,
  };
}

export async function fetchAndExtract(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Seymour/1.0; +https://github.com/seymour)",
    },
  });
  const html = await response.text();
  return extractContent(html, url);
}
