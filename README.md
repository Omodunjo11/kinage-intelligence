# Kinage Intelligence Dashboard

> Signal intelligence for analysts. Turns noisy news feeds into a structured, ranked, filterable intelligence layer — powered by a Python AI backend.

**Live:** [kinage-intelligence.vercel.app](https://kinage-intelligence.vercel.app) · **AI Backend:** [Kinage-AL-](https://github.com/Omodunjo11/Kinage-AL-)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Kinage-AL- (Python)                    │
│                                                             │
│  RSS / Web / Reddit ──► ingestion/ ──► corpus/             │
│                                           │                 │
│                         utils/            ▼                 │
│                     ┌─────────┐   orchestrator/             │
│                     │semantic │   score_chunks.py           │
│                     │ scorer  │   generate_ranked_feed.py   │
│                     └────┬────┘          │                  │
│                          └──────────────►│                  │
│                                          ▼                  │
│                               outputs/ranked_chunks.json    │
└──────────────────────────────────────────┬──────────────────┘
                                           │  sync_to_app.sh
                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  kinage-intelligence (Next.js)              │
│                                                             │
│  data/ranked_chunks.json                                    │
│         │                                                   │
│         ▼                                                   │
│  scripts/curate-signals.mjs   ← applies Kinage intake profile
│  scripts/enrich-authors.mjs   ← scrapes + scores authors   │
│  scripts/build-outreach-queues.mjs ← Clay / HubSpot queues │
│         │                                                   │
│         ▼                                                   │
│  app/api/articles  app/api/authors                          │
│         │                                                   │
│         ▼                                                   │
│  app/dashboard  ← analyst-facing intelligence feed          │
└─────────────────────────────────────────────────────────────┘
```

The Python AI layer handles **signal ingestion, scoring, and ranking**. This Next.js app handles **curation, author enrichment, and the analyst interface**. They communicate via a JSON handoff (`ranked_chunks.json`) triggered by `sync_to_app.sh`.

---

## What This Does

Kinage's analyst team was spending the first hour of every morning manually trawling news sources to track market signals. This dashboard replaces that workflow entirely.

**The pipeline:**
1. `Kinage-AL-` ingests from RSS, web scraping, and Reddit — scores each chunk using domain-specific semantic embeddings with a 14-day recency decay half-life
2. `sync_to_app.sh` runs the full scoring pipeline and copies `ranked_chunks.json` to this repo, triggering a Vercel auto-deploy
3. `scripts/curate-signals.mjs` applies the Kinage intake profile to filter and weight signals for analyst relevance
4. `scripts/enrich-authors.mjs` scrapes author profiles and scores them on domain authority and publication track record
5. The dashboard surfaces a filterable feed by recency bucket (today / this week / this month), topic, and signal tier

---

## Signal Model

Signals are classified into three tiers defined in `lib/signalModel.ts`:

| Tier | Definition | Dashboard Treatment |
|------|-----------|-------------------|
| T1 | Direct mention of portfolio company or named competitor | Top feed, alert-eligible |
| T2 | Thematic shift in adjacent market | Standard feed |
| T3 | Ambient context | Archive only |

**Scoring weights:** semantic relevance (60%) + recency multiplier (25%) + author credibility (15%)

---

## Key Files

```
lib/
  signalModel.ts             Signal taxonomy, scoring weights, tier definitions
  articles.ts                Article schema and feed logic
  thoughtLeaders.ts          Curated author list with domain tags
  kinageProfile.ts           Kinage-specific intake profile and filter rules

scripts/
  curate-signals.mjs         Applies intake profile; outputs curated_signals.json
  enrich-authors.mjs         Scrapes author data; scores by domain authority
  build-outreach-queues.mjs  Generates Clay + HubSpot outreach payloads

app/
  dashboard/                 Analyst intelligence feed
  api/articles/              Articles API route
  api/authors/               Author enrichment API route
```

---

## Running Locally

```bash
npm install
npm run dev
```

**To refresh signals from the AI layer** (requires `Kinage-AL-` cloned as sibling directory):
```bash
# In Kinage-AL- repo:
bash sync_to_app.sh
```

**Curation and enrichment scripts:**
```bash
# Dry-run author enrichment (no writes)
npm run authors:enrich

# Write enriched author data
npm run authors:enrich:write

# Apply Kinage intake profile, write curated_signals.json
npm run signals:curate

# Build Clay + HubSpot outreach queue payloads
npm run outreach:build
```

---

## Related Repos

| Repo | Role |
|------|------|
| [Kinage-AL-](https://github.com/Omodunjo11/Kinage-AL-) | Python AI backend — ingestion, semantic scoring, ranked feed |
| [Kinage-Transcript-Tool](https://github.com/Omodunjo11/Kinage-Transcript-Tool) | Meeting intelligence pipeline |
| [Kinage-Notifications](https://github.com/Omodunjo11/Kinage-Notifications) | Event-driven analyst alert layer |
