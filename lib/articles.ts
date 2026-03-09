import path from "path";
import fs from "fs/promises";

export type Article = {
  id: string;
  title: string;
  url: string;
  published_at: string;
  rss_source: string;
  score: number;
  dominant_domain: string;
  summary: string;
  why_it_matters?: string;
};

export async function getArticles(): Promise<Article[]> {
  const filePath = path.join(process.cwd(), "data", "ranked_chunks.json");
  const file = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(file) as Article[];

  return data;
}
