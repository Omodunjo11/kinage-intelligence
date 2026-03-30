#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const cwd = process.cwd();
const sourcePath = path.join(cwd, "data", "ranked_chunks.json");
const profilePath = path.join(cwd, "config", "kinage-profile.json");
const curatedPath = path.join(cwd, "data", "curated_signals.json");
const reportPath = path.join(cwd, "data", "curation_report.json");

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
  const bypass = level === "CRITICAL" && fitScore >= profile.priorityBypassFitScore;
  const accepted =
    ((audienceHits.length > 0 &&
      problemHits.length > 0 &&
      excludeHits.length === 0 &&
      fitScore >= profile.minFitScore) ||
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

  const evaluated = rows.map((row) => ({
    row,
    result: evaluate(row, profile),
  }));

  const curated = evaluated
    .filter((item) => item.result.accepted)
    .sort((a, b) => (b.row.score ?? 0) - (a.row.score ?? 0))
    .map((item) => {
      const metadata = item.row.metadata ?? {};
      return {
        ...item.row,
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

  const report = {
    generated_at: new Date().toISOString(),
    profile_version: profile.version,
    source_count: rows.length,
    curated_count: curated.length,
    acceptance_rate: rows.length ? Number((curated.length / rows.length).toFixed(3)) : 0,
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
