import fs from "fs/promises";
import path from "path";

import { evaluateKinageFit } from "@/lib/kinageProfile";
import { DOMAIN_MAP, type DomainKey, getPriority, resolveDomains } from "@/lib/signalModel";

export type AgeBucket = "today" | "this_week" | "this_month" | "older";
export type IngestRecencyBucket = "newer" | "older";

export type RawChunk = {
  id?: string;
  text?: string;
  score?: number;
  ingested_at?: string;
  age_bucket?: AgeBucket;
  is_new_ingest?: boolean;
  ingest_recency_bucket?: IngestRecencyBucket;
  summary?: string;
  why_it_matters?: string;
  risk_type?: string;
  entities?: string[];
  severity?: string;
  metadata?: {
    title?: string;
    url?: string;
    source?: string;
    feed_name?: string;
    feed_url?: string;
    published?: string;
    domain_tags?: string[];
    dominant_domain?: string;
    summary?: string;
    why_it_matters?: string;
    risk_type?: string;
    entities?: string[];
    severity?: string;
    author?: string;
    authors?: string[] | string;
    byline?: string;
  };
};

export type NormalizedArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  feedName: string;
  published: string;
  score: number;
  relevance: number;
  ageBucket: AgeBucket;
  isNewIngest: boolean;
  recencyBucket: IngestRecencyBucket;
  ingestedAt: string;
  priority: ReturnType<typeof getPriority>["level"];
  priorityGuidance: string;
  domainTags: DomainKey[];
  primaryDomain: DomainKey | null;
  summary?: string;
  why_it_matters?: string;
  risk_type?: string;
  entities?: string[];
  severity?: string;
  author?: string;
  kinageFitScore: number;
  kinageAccepted: boolean;
  kinageReasons: string[];
};

export type AuthorActivity = {
  author: string;
  signalCount: number;
  avgRelevance: number;
  topDomain: string;
  latestPublished: string;
};

const DATA_FILE = path.join(process.cwd(), "data", "ranked_chunks.json");

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function deriveAgeBucket(published: string, nowTs = Date.now()): AgeBucket {
  const ts = parseTimestamp(published);
  if (ts === null) return "older";
  const diff = Math.max(nowTs - ts, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff <= dayMs) return "today";
  if (diff <= 7 * dayMs) return "this_week";
  if (diff <= 30 * dayMs) return "this_month";
  return "older";
}

async function readRankedChunks(): Promise<RawChunk[]> {
  const file = await fs.readFile(DATA_FILE, "utf-8");
  const data = JSON.parse(file);
  return Array.isArray(data) ? (data as RawChunk[]) : [];
}

function parseAuthor(m: RawChunk["metadata"]): string | undefined {
  if (!m) return undefined;
  if (typeof m.author === "string" && m.author.trim()) return m.author.trim();
  if (Array.isArray(m.authors)) {
    const first = m.authors.find((name) => typeof name === "string" && name.trim());
    if (first) return first.trim();
  }
  if (typeof m.authors === "string" && m.authors.trim()) return m.authors.trim();
  if (typeof m.byline === "string" && m.byline.trim()) {
    return m.byline.replace(/^by\s+/i, "").trim();
  }
  return undefined;
}

export function normalizeChunk(
  raw: RawChunk,
  options?: { latestIngestTs?: number | null; recencyWindowHours?: number; nowTs?: number }
): NormalizedArticle | null {
  const m = raw.metadata ?? {};
  const title =
    m.title ||
    `${raw.text ?? ""}`.slice(0, 120).trim() ||
    "Untitled signal";
  const score = typeof raw.score === "number" ? raw.score : 0;
  if (score <= 0) return null;

  const summary = m.summary ?? raw.summary;
  const riskType = m.risk_type ?? raw.risk_type;
  const resolved = resolveDomains({
    domainTags: Array.isArray(m.domain_tags) ? m.domain_tags : [],
    dominantDomain: m.dominant_domain,
    riskType,
    title,
    summary,
  });
  const priority = getPriority(score);
  const fit = evaluateKinageFit({
    title,
    summary,
    text: raw.text,
    source: m.source,
    feedName: m.feed_name,
    relevance: score,
    riskType,
    domainTags: resolved.domains,
    primaryDomain: resolved.primaryDomain,
  });
  const nowTs = options?.nowTs ?? Date.now();
  const published = m.published ?? raw.ingested_at ?? "";
  const ingestedAt = raw.ingested_at ?? published;
  const ageBucket = raw.age_bucket ?? deriveAgeBucket(published, nowTs);
  const recencyWindowMs = Math.max(options?.recencyWindowHours ?? 72, 1) * 60 * 60 * 1000;
  const currentIngestTs = parseTimestamp(ingestedAt);
  const latestIngestTs = options?.latestIngestTs ?? null;
  const derivedIsNewIngest =
    latestIngestTs !== null &&
    currentIngestTs !== null &&
    latestIngestTs - currentIngestTs <= recencyWindowMs;
  const isNewIngest =
    typeof raw.is_new_ingest === "boolean" ? raw.is_new_ingest : derivedIsNewIngest;
  const recencyBucket: IngestRecencyBucket =
    raw.ingest_recency_bucket ??
    (isNewIngest ? "newer" : "older");

  return {
    id: raw.id ?? Math.random().toString(36).slice(2),
    title: title.endsWith("…") ? title : title,
    url: m.url ?? "",
    source: m.source ?? m.feed_name ?? "unknown",
    feedName: m.feed_name ?? "",
    published,
    score,
    relevance: score,
    ageBucket,
    isNewIngest,
    recencyBucket,
    ingestedAt,
    priority: priority.level,
    priorityGuidance: priority.guidance,
    domainTags: resolved.domains,
    primaryDomain: resolved.primaryDomain,
    summary,
    why_it_matters: m.why_it_matters ?? raw.why_it_matters,
    risk_type: riskType,
    entities: Array.isArray(m.entities)
      ? m.entities
      : Array.isArray(raw.entities)
      ? raw.entities
      : undefined,
    severity: m.severity ?? raw.severity,
    author: parseAuthor(m),
    kinageFitScore: fit.fitScore,
    kinageAccepted: fit.accepted,
    kinageReasons: fit.reasons,
  };
}

export async function getArticles(): Promise<RawChunk[]> {
  return readRankedChunks();
}

export async function getNormalizedArticles(options?: {
  includeRejected?: boolean;
  recencyWindowHours?: number;
}): Promise<NormalizedArticle[]> {
  const raw = await readRankedChunks();
  const includeRejected = options?.includeRejected ?? false;
  const recencyWindowHours = options?.recencyWindowHours ?? 72;
  const nowTs = Date.now();
  const latestIngestTs = raw
    .map((chunk) => parseTimestamp(chunk.ingested_at))
    .filter((ts): ts is number => ts !== null)
    .sort((a, b) => b - a)[0] ?? null;

  const normalized = raw
    .map((chunk) =>
      normalizeChunk(chunk, { latestIngestTs, recencyWindowHours, nowTs })
    )
    .filter((article): article is NormalizedArticle => article !== null)
    .sort((a, b) => b.score - a.score);

  if (includeRejected) return normalized;
  return normalized.filter((article) => article.kinageAccepted);
}

export async function getAuthorActivity(): Promise<AuthorActivity[]> {
  const articles = await getNormalizedArticles();
  const grouped = new Map<
    string,
    {
      count: number;
      scoreSum: number;
      latestPublished: string;
      domains: Map<DomainKey, number>;
    }
  >();

  for (const article of articles) {
    if (!article.author) continue;
    const entry =
      grouped.get(article.author) ??
      {
        count: 0,
        scoreSum: 0,
        latestPublished: "",
        domains: new Map<DomainKey, number>(),
      };
    entry.count += 1;
    entry.scoreSum += article.relevance;
    if (!entry.latestPublished || article.published > entry.latestPublished) {
      entry.latestPublished = article.published;
    }
    for (const domain of article.domainTags) {
      entry.domains.set(domain, (entry.domains.get(domain) ?? 0) + 1);
    }
    grouped.set(article.author, entry);
  }

  return [...grouped.entries()]
    .map(([author, entry]) => {
      const [domain] = [...entry.domains.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
      return {
        author,
        signalCount: entry.count,
        avgRelevance: entry.scoreSum / entry.count,
        topDomain: domain ? DOMAIN_MAP[domain].label : "Unassigned",
        latestPublished: entry.latestPublished,
      };
    })
    .sort((a, b) => {
      const rankA = a.signalCount * 0.65 + a.avgRelevance * 0.35;
      const rankB = b.signalCount * 0.65 + b.avgRelevance * 0.35;
      return rankB - rankA;
    });
}
