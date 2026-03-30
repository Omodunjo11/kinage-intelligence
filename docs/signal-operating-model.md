# Signal Operating Model

Updated: 2026-03-30

## Kinage profile controls

The curation and API filtering use a shared profile file:

- `config/kinage-profile.json`

Key controls:

- `audienceTerms`: requires elder/caregiver context.
- `problemTerms`: requires financial-risk/problem context.
- `excludeTerms`: hard exclusions for off-mission topics.
- `preferredDomains`: boosts core domains (A-D).
- `preferredFeeds`: boosts feeds that historically align with Kinage intent.
- `deprioritizedFeeds`: penalizes low-yield feeds.
- `minFitScore`: acceptance threshold.
- `priorityBypassFitScore`: allows very strong critical signals through.

To tune intake specificity:

1. Add/remove terms in `audienceTerms` and `problemTerms`.
2. Raise `minFitScore` for stricter intake.
3. Expand `excludeTerms` for recurring noise.
4. Review `data/curation_report.json` weekly and demote weak feeds.

## 1) Domain assignment and filter behavior

Signals now use canonical domain assignment before rendering:

1. Primary source: `metadata.dominant_domain` (if present).
2. Secondary source: `risk_type`.
3. Next: `domain_tags[]`.
4. Final fallback: keyword inference from title + summary.

The dashboard **Domain filter** uses `primaryDomain` (not any-tag contains) so selecting a domain narrows by topic ownership instead of broad overlap.

### Inconsistent tagging investigation

Issue observed across contexts: labels like `bill pay`, `bill execution`, and `execution` were interpreted differently between ingestion and UI.

Fix applied:

- Introduced alias normalization in [`lib/signalModel.ts`](../lib/signalModel.ts).
- Added mappings for context variants:
  - Bill pay / execution -> `DOMAIN_A`
  - Fraud classification / scam / exploitation -> `DOMAIN_C`
  - Cognitive / dementia -> `DOMAIN_D`
  - Caregiver/family coordination -> `DOMAIN_B`
- Added model version marker (`DOMAIN_MODEL_VERSION`) so changes are traceable.

## 2) Relevance, Priority, Severity, and Score

### Relevance (Score)

- Numeric signal value from ranking pipeline.
- Displayed as `relevance`.
- Higher means stronger importance/fit.

### Priority

- Derived directly from score:
  - `CRITICAL`: score >= 2.0
  - `HIGH`: score >= 1.0
  - `MEDIUM`: score >= 0.5
  - `LOW`: score < 0.5
- Used for response urgency and triage SLA.

### Severity

- Content/risk-intensity label from classifier metadata (`Low`, `Moderate`, `Elevated`, `Critical`).
- Severity is independent from priority; they can diverge.
  - Example: high-severity but low-priority if weak relevance to active strategy.
  - Example: high-priority but moderate-severity if strategically urgent.

### Practical interpretation

- Priority answers: "How quickly should we act?"
- Severity answers: "How harmful is the underlying risk?"
- Score/Relevance answers: "How strongly should this influence current decisioning?"

## 3) Metric definitions

### Signals (7d) volume metric

- Definition: number of signals with published timestamp in the last 7-day window.
- Why this replaced "Total Signals": total count is often historical and can be misleading as an operational KPI.

Recommended operating range:

- 20-60 signals/week: healthy for manual weekly review.
- <20/week: source coverage may be too thin.
- >60/week: introduce tighter filters or auto-triage rules.

### Average Relevance

- Mean relevance score across currently visible signals.
- Use it as quality density, not absolute volume.
- Best interpreted together with volume:
  - High volume + low avg relevance -> noisy feed.
  - Moderate volume + high avg relevance -> actionable feed.

## 4) Review cadence

Suggested cadence for actionable intelligence:

- Daily: scan `CRITICAL` queue and assign owners.
- Weekly: full review of `HIGH` + `MEDIUM`.
- Monthly: evaluate source quality, domain balance, and threshold tuning.
