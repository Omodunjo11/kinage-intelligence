export type DomainKey =
  | "DOMAIN_A"
  | "DOMAIN_B"
  | "DOMAIN_C"
  | "DOMAIN_D"
  | "DOMAIN_E"
  | "DOMAIN_F"
  | "DOMAIN_G";

export type Severity = "Low" | "Moderate" | "Elevated" | "Critical";
export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export const DOMAIN_MODEL_VERSION = "2026-03-30";

export const DOMAIN_MAP: Record<
  DomainKey,
  { id: string; label: string; color: string; description: string }
> = {
  DOMAIN_A: {
    id: "A",
    label: "Bill Execution",
    color: "#2563eb",
    description: "Paying bills correctly and on-time, avoiding missed payments.",
  },
  DOMAIN_B: {
    id: "B",
    label: "Family Coordination",
    color: "#7c3aed",
    description: "Family/caregiver alignment and handoffs for financial care.",
  },
  DOMAIN_C: {
    id: "C",
    label: "Elder Fraud",
    color: "#dc2626",
    description: "Scams, exploitation, abuse, and consumer protection signals.",
  },
  DOMAIN_D: {
    id: "D",
    label: "Cognitive Decline",
    color: "#ca8a04",
    description: "Memory/cognitive issues affecting money decisions and safety.",
  },
  DOMAIN_E: {
    id: "E",
    label: "Dignity & Autonomy",
    color: "#059669",
    description: "Maintaining independence and dignity while reducing risk.",
  },
  DOMAIN_F: {
    id: "F",
    label: "Competitor Signal",
    color: "#ea580c",
    description: "Market moves from adjacent providers and competitive products.",
  },
  DOMAIN_G: {
    id: "G",
    label: "Professional Channel",
    color: "#0284c7",
    description: "Signals from care managers, DMMs, legal, and clinical channels.",
  },
};

export const DOMAIN_KEYS = Object.keys(DOMAIN_MAP) as DomainKey[];

const DOMAIN_ALIASES: Record<string, DomainKey> = {
  domain_a: "DOMAIN_A",
  a: "DOMAIN_A",
  bill_execution: "DOMAIN_A",
  bill_execution_risk: "DOMAIN_A",
  bill_pay: "DOMAIN_A",
  bill_payment: "DOMAIN_A",
  payment_execution: "DOMAIN_A",
  execution: "DOMAIN_A",
  paying_bills: "DOMAIN_A",

  domain_b: "DOMAIN_B",
  b: "DOMAIN_B",
  family_coordination: "DOMAIN_B",
  caregiver_coordination: "DOMAIN_B",
  coordination: "DOMAIN_B",
  handoff: "DOMAIN_B",
  family_support: "DOMAIN_B",

  domain_c: "DOMAIN_C",
  c: "DOMAIN_C",
  elder_fraud: "DOMAIN_C",
  fraud: "DOMAIN_C",
  fraud_classification: "DOMAIN_C",
  scam: "DOMAIN_C",
  exploitation: "DOMAIN_C",
  abuse: "DOMAIN_C",
  consumer_protection: "DOMAIN_C",

  domain_d: "DOMAIN_D",
  d: "DOMAIN_D",
  cognitive_decline: "DOMAIN_D",
  dementia: "DOMAIN_D",
  cognition: "DOMAIN_D",
  memory_decline: "DOMAIN_D",
  cognitive: "DOMAIN_D",

  domain_e: "DOMAIN_E",
  e: "DOMAIN_E",
  dignity_autonomy: "DOMAIN_E",
  autonomy: "DOMAIN_E",
  dignity: "DOMAIN_E",
  independence: "DOMAIN_E",

  domain_f: "DOMAIN_F",
  f: "DOMAIN_F",
  competitor_signal: "DOMAIN_F",
  competitor: "DOMAIN_F",
  market_competitor: "DOMAIN_F",

  domain_g: "DOMAIN_G",
  g: "DOMAIN_G",
  professional_channel: "DOMAIN_G",
  daily_money_manager: "DOMAIN_G",
  dmm: "DOMAIN_G",
  geriatric_care_manager: "DOMAIN_G",
  care_manager: "DOMAIN_G",
};

function normToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function canonicalizeDomainToken(raw: string): DomainKey | null {
  if (!raw) return null;
  const direct = raw.trim().toUpperCase();
  if (DOMAIN_KEYS.includes(direct as DomainKey)) {
    return direct as DomainKey;
  }
  const alias = DOMAIN_ALIASES[normToken(raw)];
  return alias ?? null;
}

export function inferDomainFromText(text: string): DomainKey | null {
  const lower = text.toLowerCase();
  if (!lower) return null;
  if (
    lower.includes("fraud") ||
    lower.includes("scam") ||
    lower.includes("exploitation") ||
    lower.includes("financial abuse")
  ) {
    return "DOMAIN_C";
  }
  if (
    lower.includes("dementia") ||
    lower.includes("alzheim") ||
    lower.includes("cognitive") ||
    lower.includes("memory loss")
  ) {
    return "DOMAIN_D";
  }
  if (
    lower.includes("caregiver") ||
    lower.includes("family") ||
    lower.includes("guardianship") ||
    lower.includes("coordination")
  ) {
    return "DOMAIN_B";
  }
  if (
    lower.includes("bill pay") ||
    lower.includes("bill payment") ||
    lower.includes("missed payment") ||
    lower.includes("utility bill")
  ) {
    return "DOMAIN_A";
  }
  return null;
}

export function resolveDomains(input: {
  domainTags?: string[];
  dominantDomain?: string;
  riskType?: string;
  title?: string;
  summary?: string;
}) {
  const fromTags = (input.domainTags ?? [])
    .map((tag) => canonicalizeDomainToken(tag))
    .filter((key): key is DomainKey => key !== null);
  const fromDominant = input.dominantDomain
    ? canonicalizeDomainToken(input.dominantDomain)
    : null;
  const fromRiskType = input.riskType
    ? canonicalizeDomainToken(input.riskType)
    : null;
  const fromText = inferDomainFromText(
    `${input.title ?? ""} ${input.summary ?? ""}`.trim()
  );

  const primary = fromDominant ?? fromRiskType ?? fromTags[0] ?? fromText ?? null;
  const unique = new Set<DomainKey>(fromTags);
  if (fromDominant) unique.add(fromDominant);
  if (fromRiskType) unique.add(fromRiskType);
  if (fromText) unique.add(fromText);
  if (primary) unique.add(primary);

  return {
    primaryDomain: primary,
    domains: [...unique],
  };
}

export function getPriority(score: number): {
  level: PriorityLevel;
  color: string;
  bg: string;
  guidance: string;
} {
  if (score >= 2.0) {
    return {
      level: "CRITICAL",
      color: "#dc2626",
      bg: "#fee2e2",
      guidance: "Review within 24 hours and assign owner immediately.",
    };
  }
  if (score >= 1.0) {
    return {
      level: "HIGH",
      color: "#ea580c",
      bg: "#ffedd5",
      guidance: "Triage this week and decide monitor vs escalation.",
    };
  }
  if (score >= 0.5) {
    return {
      level: "MEDIUM",
      color: "#ca8a04",
      bg: "#fef9c3",
      guidance: "Review during weekly intel sync and watch for repeats.",
    };
  }
  return {
    level: "LOW",
    color: "#15803d",
    bg: "#dcfce7",
    guidance: "Track for trend context; no immediate action required.",
  };
}

export function severityColor(severity: Severity): string {
  return {
    Low: "#15803d",
    Moderate: "#ca8a04",
    Elevated: "#ea580c",
    Critical: "#dc2626",
  }[severity];
}

export function suggestCadence(volume7d: number): string {
  if (volume7d < 20) return "Increase source coverage; aim for 20-60 signals per week.";
  if (volume7d <= 60) return "Healthy volume for weekly actionable review cadence.";
  return "High volume. Tighten filters or add auto-triage before weekly review.";
}
