import type { Request } from "express";

export interface AuthRequest extends Request {
  userId?: number;
}

export interface NormalizedArticle {
  guid: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
}

export interface ExtractedContent {
  title: string | null;
  content: string | null;
  textContent: string | null;
  excerpt: string | null;
}
