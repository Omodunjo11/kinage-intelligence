import profile from "@/config/kinage-profile.json";
import { getPriority, type DomainKey } from "@/lib/signalModel";

type FitInput = {
  title?: string;
  summary?: string;
  text?: string;
  source?: string;
  feedName?: string;
  relevance: number;
  riskType?: string;
  domainTags: DomainKey[];
  primaryDomain: DomainKey | null;
};

export type KinageFit = {
  fitScore: number;
  accepted: boolean;
  reasons: string[];
  audienceHits: string[];
  problemHits: string[];
  excludeHits: string[];
};

export const KINAGE_PROFILE = profile;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findHits(text: string, terms: string[]): string[] {
  const lowered = normalize(text);
  return terms.filter((term) => lowered.includes(normalize(term)));
}

export function evaluateKinageFit(input: FitInput): KinageFit {
  const body = `${input.title ?? ""} ${input.summary ?? ""} ${input.text ?? ""} ${
    input.riskType ?? ""
  }`;
  const audienceHits = findHits(body, KINAGE_PROFILE.audienceTerms);
  const problemHits = findHits(body, KINAGE_PROFILE.problemTerms);
  const excludeHits = findHits(body, KINAGE_PROFILE.excludeTerms);

  const priority = getPriority(input.relevance).level;
  const relevanceNorm = Math.min(input.relevance / 2, 1);
  const audienceNorm = Math.min(audienceHits.length / 2, 1);
  const problemNorm = Math.min(problemHits.length / 2, 1);
  const domainAlign = input.primaryDomain
    ? KINAGE_PROFILE.preferredDomains.includes(input.primaryDomain)
      ? 1
      : 0
    : input.domainTags.some((domain) => KINAGE_PROFILE.preferredDomains.includes(domain))
    ? 0.6
    : 0;

  const sourceText = `${input.feedName ?? ""} ${input.source ?? ""}`;
  const isPreferredFeed = KINAGE_PROFILE.preferredFeeds.some((term) =>
    sourceText.includes(term)
  );
  const isDeprioritizedFeed = KINAGE_PROFILE.deprioritizedFeeds.some((term) =>
    sourceText.includes(term)
  );
  const feedScore = isPreferredFeed ? 1 : isDeprioritizedFeed ? 0 : 0.5;

  const fitScore =
    relevanceNorm * 0.35 +
    audienceNorm * 0.2 +
    problemNorm * 0.2 +
    domainAlign * 0.15 +
    feedScore * 0.1;

  const reasons: string[] = [];
  const hasAudience = audienceHits.length > 0;
  const hasProblem = problemHits.length > 0;
  const hasExclusions = excludeHits.length > 0;

  if (!hasAudience) reasons.push("no_audience_context");
  if (!hasProblem) reasons.push("no_problem_context");
  if (hasExclusions) reasons.push("contains_excluded_topic");
  if (domainAlign === 0) reasons.push("domain_not_core");
  if (isDeprioritizedFeed) reasons.push("deprioritized_feed");

  const bypass = priority === "CRITICAL" && fitScore >= KINAGE_PROFILE.priorityBypassFitScore;
  const accepted =
    (hasAudience && hasProblem && !hasExclusions && fitScore >= KINAGE_PROFILE.minFitScore) ||
    bypass;

  return {
    fitScore,
    accepted,
    reasons,
    audienceHits,
    problemHits,
    excludeHits,
  };
}
