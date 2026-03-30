# Author Enrichment and Outreach Workflow

Updated: 2026-03-30

## Goal

Capture article authors, rank high-value authors/signals, enrich in Clay, and route actionable outreach tasks into HubSpot.

## Workflow overview

1. Scrape author metadata from article URLs.
2. Build author activity ranking from signal frequency + relevance.
3. Export high-value signals/authors to Clay candidate payload.
4. Convert enriched results into HubSpot assignment queue.

## Commands

Dry-run author scrape:

```bash
npm run authors:enrich
```

Persist scraped author fields to `ranked_chunks.json`:

```bash
npm run authors:enrich:write
```

Build Clay + HubSpot queue payloads:

```bash
npm run signals:curate
npm run outreach:build
```

## Files generated

- `data/author_activity.json`
- `data/curated_signals.json`
- `data/curation_report.json`
- `data/clay_signal_candidates.json`
- `data/hubspot_outreach_queue.json`

## Author ranking model

Current rank formula:

`author_rank = (signal_count * 0.65) + (avg_relevance * 0.35)`

This intentionally favors sustained signal frequency while still rewarding higher quality.

## Clay enrichment handoff

Recommended Clay table fields:

- `contact_name`
- `source_url`
- `content_title`
- `domain`
- `priority`
- `relevance_score`
- `notes`

Suggested Clay enrichment:

- LinkedIn profile match
- role/title
- organization
- valid work email
- geography

## HubSpot routing model

The generated queue includes `outreach_owner` by domain:

- Elder Fraud -> `fraud_outreach`
- Cognitive Decline -> `clinical_partnerships`
- Family Coordination / Bill Execution -> `caregiver_partnerships`
- Other -> `market_intel`

Recommended HubSpot automation:

1. Ingest rows from `hubspot_outreach_queue.json` (or Clay webhook output).
2. Create/update contact.
3. Create task for `outreach_owner`.
4. Set status to `pending_outreach`.
5. Track response and close-loop to signal outcomes.

## Notes and limitations

- Author scraping quality depends on source page metadata quality.
- Many Google News redirect links may hide byline unless redirect resolves to the publisher article.
- For production reliability, run enrichment in batches and cache successful URL -> author mappings.
