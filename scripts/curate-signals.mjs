#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const cwd = process.cwd();
const sourcePath = path.join(cwd, "data", "ranked_chunks.json");
const profilePath = path.join(cwd, "config", "kinage-profile.json");
const curatedPath = path.join(cwd, "data", "curated_signals.json");
const reportPath = path.join(cwd, "data", "curation_report.json");
const AGE_BUCKET_ORDER = ["today", "this_week", "this_month", "older"];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hits(text, terms) {
  const body = normalize(text);
  return terms.filter((term) => body.includes(normalize(term)));
}

function priority(score) {
  if (score >= 2.0) return "CRITICAL";
  if (score >= 1.0) return "HIGH";
  if (score >= 0.5) return "MEDIUM";
  return "LOW";
}

function parseTs(value) {
  const ts = Date.parse(String(value ?? ""));
  return Number.isFinite(ts) ? ts : null;
}

function ageBucketFromTimestamp(ts, nowTs = Date.now()) {
  if (!Number.isFinite(ts)) return "older";
  const diffMs = Math.max(nowTs - ts, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs <= dayMs) return "today";
  if (diffMs <= 7 * dayMs) return "this_week";
  if (diffMs <= 30 * dayMs) return "this_month";
  return "older";
}

function evaluate(row, profile) {
  const metadata = row.metadata ?? {};
  const score = typeof row.score === "number" ? row.score : 0;
  const body = `${metadata.title ?? ""} ${metadata.summary ?? row.summary ?? ""} ${
    row.text ?? ""
  } ${metadata.risk_type ?? row.risk_type ?? ""}`;
  const audienceHits = hits(body, profile.audienceTerms);
  const problemHits = hits(body, profile.problemTerms);
  const excludeHits = hits(body, profile.excludeTerms);
  const domainTags = Array.isArray(metadata.domain_tags) ? metadata.domain_tags : [];
  const domainAlign = domainTags.some((d) => profile.preferredDomains.includes(d)) ? 1 : 0;

  const sourceText = `${metadata.feed_name ?? ""} ${metadata.source ?? ""}`.toLowerCase();
  const preferredFeed = profile.preferredFeeds.some((f) =>
    sourceText.includes(String(f).toLowerCase())
  );
  const deprioritizedFeed = profile.deprioritizedFeeds.some((f) =>
    sourceText.includes(String(f).toLowerCase())
  );
  const feedScore = preferredFeed ? 1 : deprioritizedFeed ? 0 : 0.5;
  const relevanceNorm = Math.min(score / 2, 1);
  const audienceNorm = Math.min(audienceHits.length / 2, 1);
  const problemNorm = Math.min(problemHits.length / 2, 1);

  const fitScore =
    relevanceNorm * 0.35 +
    audienceNorm * 0.2 +
    problemNorm * 0.2 +
    domainAlign * 0.15 +
    feedScore * 0.1;

  const level = priority(score);
  const requireBothContexts = profile.requireBothContexts ?? true;
  const hasAudience = audienceHits.length > 0;
  const hasProblem = problemHits.length > 0;
  const contextPass = requireBothContexts
    ? hasAudience && hasProblem
    : hasAudience || hasProblem;
  const singleContextPass =
    !requireBothContexts &&
    (hasAudience !== hasProblem) &&
    fitScore >= (profile.allowSingleContextWithScore ?? 0.55);
  const preferredFeedPass =
    preferredFeed &&
    fitScore >= (profile.allowPreferredFeedWithScore ?? 0.5);
  const bypass = level === "CRITICAL" && fitScore >= profile.priorityBypassFitScore;
  const accepted =
    ((contextPass &&
      excludeHits.length === 0 &&
      fitScore >= profile.minFitScore) ||
      (singleContextPass && excludeHits.length === 0) ||
      (preferredFeedPass && excludeHits.length === 0) ||
      bypass) &&
    score > 0;

  return {
    fitScore,
    accepted,
    audienceHits,
    problemHits,
    excludeHits,
    priority: level,
  };
}

async function main() {
  const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
  const rows = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  if (!Array.isArray(rows)) throw new Error("ranked_chunks.json must be an array");
  const recencyWindowHours = Number(profile.recencyWindowHours ?? 72);
  const recencyWindowMs = Math.max(recencyWindowHours, 1) * 60 * 60 * 1000;
  const nowTs = Date.now();
  const ingestedValues = rows
    .map((row) => parseTs(row.ingested_at))
    .filter((value) => value !== null);
  const latestIngestTs = ingestedValues.length ? Math.max(...ingestedValues) : null;

  const evaluated = rows.map((row) => ({
    row,
    result: evaluate(row, profile),
  }));

  const curated = evaluated
    .filter((item) => item.result.accepted)
    .sort((a, b) => (b.row.score ?? 0) - (a.row.score ?? 0))
    .map((item) => {
      const metadata = item.row.metadata ?? {};
      const publishedTs = parseTs(metadata.published ?? item.row.ingested_at);
      const ingestedTs = parseTs(item.row.ingested_at);
      const isNewIngest =
        latestIngestTs !== null &&
        ingestedTs !== null &&
        latestIngestTs - ingestedTs <= recencyWindowMs;
      const ingestRecencyBucket = isNewIngest ? "newer" : "older";
      return {
        ...item.row,
        age_bucket: ageBucketFromTimestamp(publishedTs ?? 0, nowTs),
        is_new_ingest: isNewIngest,
        ingest_recency_bucket: ingestRecencyBucket,
        metadata: {
          ...metadata,
          kinage_fit_score: item.result.fitScore,
          kinage_priority: item.result.priority,
          kinage_audience_hits: item.result.audienceHits,
          kinage_problem_hits: item.result.problemHits,
        },
      };
    });

  const byFeed = new Map();
  for (const item of evaluated) {
    const feed = item.row.metadata?.feed_name ?? "unknown";
    const prev = byFeed.get(feed) ?? { total: 0, accepted: 0 };
    prev.total += 1;
    if (item.result.accepted) prev.accepted += 1;
    byFeed.set(feed, prev);
  }

  const feedPrecision = [...byFeed.entries()]
    .map(([feed, stats]) => ({
      feed,
      total: stats.total,
      accepted: stats.accepted,
      precision: stats.total ? Number((stats.accepted / stats.total).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.precision - a.precision);

  const recencyBreakdown = curated.reduce(
    (acc, row) => {
      const bucket = row.ingest_recency_bucket === "newer" ? "newer" : "older";
      const ageBucket = AGE_BUCKET_ORDER.includes(row.age_bucket)
        ? row.age_bucket
        : "older";
      acc[bucket] += 1;
      acc.age_buckets[ageBucket] = (acc.age_buckets[ageBucket] ?? 0) + 1;
      return acc;
    },
    {
      newer: 0,
      older: 0,
      age_buckets: {
        today: 0,
        this_week: 0,
        this_month: 0,
        older: 0,
      },
    }
  );

  const report = {
    generated_at: new Date().toISOString(),
    profile_version: profile.version,
    latest_ingest_at: latestIngestTs ? new Date(latestIngestTs).toISOString() : null,
    recency_window_hours: recencyWindowHours,
    source_count: rows.length,
    curated_count: curated.length,
    acceptance_rate: rows.length ? Number((curated.length / rows.length).toFixed(3)) : 0,
    recency_breakdown: recencyBreakdown,
    feed_precision: feedPrecision,
  };

  await fs.writeFile(curatedPath, `${JSON.stringify(curated, null, 2)}\n`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Curated signals: ${curated.length}/${rows.length}`);
  console.log(`Acceptance rate: ${report.acceptance_rate}`);
  console.log(`Wrote: ${curatedPath}`);
  console.log(`Wrote: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
