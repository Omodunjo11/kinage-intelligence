# Paywalled Source Strategy (NYT/WSJ/Bloomberg)

Updated: 2026-03-30

## Short answer

Yes, use Google News RSS to capture metadata and headlines from paywalled publishers.  
No, do not attempt paywall bypass in automation.

## How to avoid missing signal

1. Ingest Google News RSS entries for tier-1 domains (`nytimes.com`, `wsj.com`, `bloomberg.com`).
2. Score/rank based on title, snippet, source, and topic/domain mapping.
3. Flag high-fit paywalled stories for human review and licensed access.
4. Look for secondary coverage and LinkedIn commentary for additional context.

## Feed pack

Use:

- `config/google-news-feeds.json`

This includes dedicated NYT DMM/elder-finance feeds, LinkedIn companion feeds, and a tier-1 paywalled feed.

## Practical workflow

1. Pull RSS entries.
2. Run Kinage curation (`npm run signals:curate`).
3. Route high-priority paywalled items to manual review queue.
4. Keep outreach automation running from curated signals (`npm run outreach:build`).
