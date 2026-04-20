#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const cwd = process.cwd();
const sourcePath = path.join(cwd, "data", "ranked_chunks.json");
const curatedPath = path.join(cwd, "data", "curated_signals.json");
const clayOutPath = path.join(cwd, "data", "clay_signal_candidates.json");
const hubspotOutPath = path.join(cwd, "data", "hubspot_outreach_queue.json");

const DOMAIN_LABELS = {
  DOMAIN_A: "Bill Execution",
  DOMAIN_B: "Family Coordination",
  DOMAIN_C: "Elder Fraud",
  DOMAIN_D: "Cognitive Decline",
  DOMAIN_E: "Dignity & Autonomy",
  DOMAIN_F: "Competitor Signal",
  DOMAIN_G: "Professional Channel",
};

function toPriority(score) {
  if (score >= 2.0) return "CRITICAL";
  if (score >= 1.0) return "HIGH";
  if (score >= 0.5) return "MEDIUM";
  return "LOW";
}

function topDomain(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "Unassigned";
  const first = tags.find((tag) => DOMAIN_LABELS[tag]);
  return first ? DOMAIN_LABELS[first] : "Unassigned";
}

function ownerByDomain(domain) {
  if (domain === "Elder Fraud") return "fraud_outreach";
  if (domain === "Cognitive Decline") return "clinical_partnerships";
  if (domain === "Family Coordination" || domain === "Bill Execution") {
    return "caregiver_partnerships";
  }
  return "market_intel";
}

async function main() {
  let file;
  let sourceLabel = "ranked_chunks.json";
  try {
    file = await fs.readFile(curatedPath, "utf8");
    sourceLabel = "curated_signals.json";
  } catch {
    file = await fs.readFile(sourcePath, "utf8");
  }
  const rows = JSON.parse(file);
  if (!Array.isArray(rows)) throw new Error("ranked_chunks.json must be an array");

  const candidates = rows
    .map((row) => {
      const metadata = row.metadata ?? {};
      const score = typeof row.score === "number" ? row.score : 0;
      const priority = toPriority(score);
      return {
        signal_id: row.id ?? "",
        title: metadata.title ?? row.text?.slice(0, 140) ?? "Untitled",
        url: metadata.url ?? "",
        source: metadata.source ?? metadata.feed_name ?? "unknown",
        author: metadata.author ?? "",
        published: metadata.published ?? row.ingested_at ?? "",
        ingested_at: row.ingested_at ?? "",
        ingest_recency_bucket: row.ingest_recency_bucket ?? "older",
        relevance_score: score,
        priority,
        domain: topDomain(metadata.domain_tags),
        summary: metadata.summary ?? row.summary ?? "",
        why_it_matters: metadata.why_it_matters ?? row.why_it_matters ?? "",
      };
    })
    .filter(
      (row) =>
        row.priority === "CRITICAL" ||
        row.priority === "HIGH" ||
        (row.priority === "MEDIUM" && row.author)
    )
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 200);

  const clayPayload = {
    generated_at: new Date().toISOString(),
    total_candidates: candidates.length,
    rows: candidates,
  };

  const hubspotQueue = candidates.map((row) => ({
    source_signal_id: row.signal_id,
    contact_name: row.author || "Unknown author",
    content_title: row.title,
    ingest_recency_bucket: row.ingest_recency_bucket,
    relevance_score: row.relevance_score,
    priority: row.priority,
    domain: row.domain,
    outreach_owner: ownerByDomain(row.domain),
    outreach_status: "pending_enrichment",
    notes: row.why_it_matters || row.summary || "No summary available",
    source_url: row.url,
  }));

  await fs.writeFile(clayOutPath, `${JSON.stringify(clayPayload, null, 2)}\n`);
  await fs.writeFile(hubspotOutPath, `${JSON.stringify(hubspotQueue, null, 2)}\n`);

  console.log(`Using source: ${sourceLabel}`);
  console.log(`Clay payload rows: ${candidates.length}`);
  console.log(`HubSpot queue rows: ${hubspotQueue.length}`);
  console.log(`Wrote: ${clayOutPath}`);
  console.log(`Wrote: ${hubspotOutPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
