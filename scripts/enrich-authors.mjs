#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const cwd = process.cwd();
const sourcePath = path.join(cwd, "data", "ranked_chunks.json");
const activityPath = path.join(cwd, "data", "author_activity.json");

const DOMAIN_LABELS = {
  DOMAIN_A: "Bill Execution",
  DOMAIN_B: "Family Coordination",
  DOMAIN_C: "Elder Fraud",
  DOMAIN_D: "Cognitive Decline",
  DOMAIN_E: "Dignity & Autonomy",
  DOMAIN_F: "Competitor Signal",
  DOMAIN_G: "Professional Channel",
};

function decodeEntities(value) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanAuthor(value) {
  if (!value) return null;
  const cleaned = decodeEntities(String(value))
    .replace(/^by\s+/i, "")
    .replace(/\s+\|\s+.+$/, "")
    .replace(/\s+-\s+.+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned) return null;
  if (cleaned.length > 90) return null;
  if (/^(staff|editorial|team|news desk)$/i.test(cleaned)) return null;
  return cleaned;
}

function extractFromJsonLd(html) {
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    candidates.push(match[1]);
  }

  for (const candidate of candidates) {
    try {
      const payload = JSON.parse(candidate.trim());
      const nodes = Array.isArray(payload)
        ? payload
        : payload["@graph"] && Array.isArray(payload["@graph"])
        ? payload["@graph"]
        : [payload];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const author = node.author;
        if (typeof author === "string") {
          const cleaned = cleanAuthor(author);
          if (cleaned) return cleaned;
        }
        if (Array.isArray(author)) {
          for (const item of author) {
            if (typeof item === "string") {
              const cleaned = cleanAuthor(item);
              if (cleaned) return cleaned;
            }
            if (item && typeof item === "object" && typeof item.name === "string") {
              const cleaned = cleanAuthor(item.name);
              if (cleaned) return cleaned;
            }
          }
        }
        if (author && typeof author === "object" && typeof author.name === "string") {
          const cleaned = cleanAuthor(author.name);
          if (cleaned) return cleaned;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractAuthorFromHtml(html) {
  const patterns = [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']parsely-author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']dc.creator["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<span[^>]+class=["'][^"']*byline[^"']*["'][^>]*>\s*([^<]+)\s*<\/span>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const cleaned = cleanAuthor(match[1]);
    if (cleaned) return cleaned;
  }

  return extractFromJsonLd(html);
}

async function resolveAuthor(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KinageAuthorBot/1.0; +https://kinage.co)",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const html = await response.text();
    return extractAuthorFromHtml(html);
  } catch {
    return null;
  }
}

function pickTopDomain(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "Unassigned";
  const first = tags.find((tag) => DOMAIN_LABELS[tag]);
  return first ? DOMAIN_LABELS[first] : "Unassigned";
}

function buildActivity(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const metadata = row.metadata ?? {};
    const author = cleanAuthor(metadata.author);
    if (!author) continue;

    const prev =
      grouped.get(author) ??
      {
        signalCount: 0,
        scoreSum: 0,
        topDomains: new Map(),
        latestPublished: "",
      };

    prev.signalCount += 1;
    prev.scoreSum += typeof row.score === "number" ? row.score : 0;
    const published = metadata.published || row.ingested_at || "";
    if (published > prev.latestPublished) prev.latestPublished = published;

    const topDomain = pickTopDomain(metadata.domain_tags);
    prev.topDomains.set(topDomain, (prev.topDomains.get(topDomain) ?? 0) + 1);
    grouped.set(author, prev);
  }

  return [...grouped.entries()]
    .map(([author, values]) => {
      const topDomain =
        [...values.topDomains.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "Unassigned";
      return {
        author,
        signalCount: values.signalCount,
        avgRelevance: values.signalCount
          ? values.scoreSum / values.signalCount
          : 0,
        topDomain,
        latestPublished: values.latestPublished,
      };
    })
    .sort((a, b) => {
      const rankA = a.signalCount * 0.65 + a.avgRelevance * 0.35;
      const rankB = b.signalCount * 0.65 + b.avgRelevance * 0.35;
      return rankB - rankA;
    });
}

async function main() {
  const shouldWrite = process.argv.includes("--write");
  const limitFlag = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitFlag ? Number(limitFlag.split("=")[1]) : 40;

  const raw = await fs.readFile(sourcePath, "utf8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) {
    throw new Error("ranked_chunks.json must be a JSON array");
  }

  let scanned = 0;
  let enriched = 0;

  for (const row of rows) {
    if (scanned >= limit) break;
    const metadata = row.metadata ?? {};
    if (cleanAuthor(metadata.author)) continue;
    if (!metadata.url) continue;

    scanned += 1;
    const author = await resolveAuthor(metadata.url);
    if (!author) continue;

    metadata.author = author;
    row.metadata = metadata;
    enriched += 1;
  }

  const activity = buildActivity(rows);

  if (shouldWrite) {
    await fs.writeFile(sourcePath, `${JSON.stringify(rows, null, 2)}\n`);
  }
  await fs.writeFile(activityPath, `${JSON.stringify(activity, null, 2)}\n`);

  console.log(`Scanned: ${scanned}`);
  console.log(`New authors found: ${enriched}`);
  console.log(`Activity rows: ${activity.length}`);
  if (!shouldWrite) {
    console.log("Dry run mode: add --write to persist author values into ranked_chunks.json");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
