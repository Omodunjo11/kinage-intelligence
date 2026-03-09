// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = "LinkedIn" | "Instagram" | "YouTube" | "Podcast" | "Blog";

export type OutreachStatus = "Not Started" | "Monitoring" | "Contacted" | "Engaged";

export type Tier = 1 | 2 | 3;

export type Priority = "immediate" | "soon" | "monitor";

export interface ThoughtLeader {
  id: string;
  name: string;
  tier: Tier;
  title: string;
  domains: string[];
  whyAligned: string;
  platforms: Platform[];
  platformHandles?: Partial<Record<Platform, string>>;
  outreachStatus: OutreachStatus;
  suggestedAngle: string;
  priority: Priority;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

export const THOUGHT_LEADERS: ThoughtLeader[] = [
  // ── TIER 1 — Highest Alignment ───────────────────────────────────────────
  {
    id: "kerry-burnight",
    name: "Dr. Kerry Burnight",
    tier: 1,
    title: "Gerontologist · NYT Bestselling Author · Elder Abuse Forensic Center Co-Founder",
    domains: ["Elder Financial Abuse", "Cognitive Decline", "Aging Dignity", "Family Coordination"],
    whyAligned:
      "Co-founded the first Elder Abuse Forensic Center. Author of 'Joyspan.' Language overlaps directly with Kinage's elder financial protection and dignity framing. Most aligned public voice for Kinage's mission.",
    platforms: ["LinkedIn", "Instagram", "YouTube", "Podcast"],
    platformHandles: { Instagram: "@the_gerontologist" },
    outreachStatus: "Not Started",
    suggestedAngle:
      "Rick reaches out via LinkedIn. Do not pitch. Reference her forensic center work and position Kinage at the intersection of elder financial protection and family coordination. Lead with dignity framing.",
    priority: "immediate",
  },
  {
    id: "sherri-snelling",
    name: "Sherri Snelling",
    tier: 1,
    title: "Caregiving & Aging Expert · Author · Media Commentator",
    domains: ["Caregiver Burnout", "Family Coordination", "Elder Financial Burden"],
    whyAligned:
      "High-profile voice on sandwich generation financial stress. Strong B2B credibility with DMMs and elder law advisors. Frequent media commentary aligns with Kinage's caregiver narrative.",
    platforms: ["LinkedIn", "Instagram", "Blog"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Engage around sandwich generation financial coordination. Reference her media commentary on caregiver financial burden. Frame Kinage as the tool that solves what she talks about.",
    priority: "immediate",
  },
  {
    id: "teepa-snow",
    name: "Teepa Snow",
    tier: 1,
    title: "Dementia Care Specialist · PAC Training Founder",
    domains: ["Cognitive Decline", "Dementia & Financial Vulnerability", "Caregiver Support"],
    whyAligned:
      "Most recognized dementia educator in the US. Her audience — caregivers of dementia patients — is Kinage's core user. High Instagram and YouTube engagement with families in active crisis.",
    platforms: ["Instagram", "YouTube", "LinkedIn"],
    platformHandles: { Instagram: "@teepasnows_pac" },
    outreachStatus: "Monitoring",
    suggestedAngle:
      "Partner angle: dementia + bill management complexity. Frame Kinage as the financial safety layer for families she already supports.",
    priority: "immediate",
  },
  {
    id: "natali-edmonds",
    name: "Dr. Natali Edmonds",
    tier: 1,
    title: "Geriatric Neuropsychologist · Dementia Caregiver Coach",
    domains: ["Dementia & Financial Vulnerability", "Caregiver Support", "Cognitive Decline"],
    whyAligned:
      "Active digital presence, highly resonant with Kinage's target caregiver audience. Focus on practical tools for families navigating dementia.",
    platforms: ["Instagram", "YouTube", "Blog"],
    platformHandles: { Instagram: "@yourdementiatherapist" },
    outreachStatus: "Monitoring",
    suggestedAngle:
      "Position Kinage as the financial tool that complements her caregiving protocols. Offer data on financial exploitation patterns in dementia households as a value-first intro.",
    priority: "soon",
  },
  {
    id: "amy-goyer",
    name: "Amy Goyer",
    tier: 1,
    title: "AARP Family & Caregiving Expert · Author",
    domains: ["Elder Financial Abuse", "Caregiving", "Family Coordination", "Fraud Prevention"],
    whyAligned:
      "AARP platform gives her institutional reach across millions of caregivers. Strong alignment on family financial coordination and fraud prevention.",
    platforms: ["LinkedIn", "Blog"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "AARP partnership angle. Reference her long-distance caregiving work. Propose Kinage as a featured tool in AARP's fraud prevention content or caregiving resource guides.",
    priority: "immediate",
  },

  // ── TIER 2 — Institutional & Policy ──────────────────────────────────────
  {
    id: "robert-espinoza",
    name: "Robert Espinoza",
    tier: 2,
    title: "PHI President & CEO · Aging Workforce Policy Leader",
    domains: ["Elder Care Policy", "Aging Workforce", "Care Infrastructure"],
    whyAligned:
      "Institutional credibility at the policy level. His framing of elder care infrastructure gaps maps to the systemic problem Kinage solves.",
    platforms: ["LinkedIn"],
    outreachStatus: "Monitoring",
    suggestedAngle:
      "Policy framing: financial vulnerability in elder care workforce transitions. Kinage as part of the infrastructure solution.",
    priority: "monitor",
  },
  {
    id: "paul-greenwood",
    name: "Paul Greenwood",
    tier: 2,
    title: "Former Deputy DA · Elder Abuse Prosecution Expert",
    domains: ["Elder Financial Abuse", "Elder Law", "Prosecution & Enforcement"],
    whyAligned:
      "Prosecution-focused authority on elder financial exploitation. Strong credibility with the legal and DMM professional channel.",
    platforms: ["LinkedIn", "Blog"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Legal channel outreach: Kinage as a financial exploitation prevention tool for attorneys, fiduciaries, and elder law practitioners.",
    priority: "soon",
  },
  {
    id: "lois-greisman",
    name: "Lois Greisman",
    tier: 2,
    title: "Former FTC Associate Director · Consumer Protection Expert",
    domains: ["Elder Fraud", "Regulatory & Policy", "Consumer Protection"],
    whyAligned:
      "Direct FTC elder fraud prevention background. Her framing positions Kinage as operationalizing what regulators recommend but cannot build.",
    platforms: ["LinkedIn"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Reference her FTC elder fraud work. Kinage as the consumer-facing tool that delivers what regulators prescribe.",
    priority: "monitor",
  },
  {
    id: "duke-han",
    name: "Duke Han",
    tier: 2,
    title: "USC Neuropsychologist · Cognitive Aging Researcher",
    domains: ["Cognitive Decline", "Financial Vulnerability Research", "Academic Credibility"],
    whyAligned:
      "Academic authority on the cognitive decline and financial decision-making intersection. His research language maps directly to Kinage's product rationale.",
    platforms: ["LinkedIn", "Blog"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Research collaboration angle: financial capacity assessment and early intervention tools. Kinage as applied research.",
    priority: "monitor",
  },
  {
    id: "debbie-toth",
    name: "Debbie Toth",
    tier: 2,
    title: "Choice in Aging CEO · Senior Services Leader",
    domains: ["Aging Services", "Community Care", "DMM Network"],
    whyAligned:
      "Operational leader with deep DMM and geriatric care management network. A referral from her organization reaches Kinage's B2B channel directly.",
    platforms: ["LinkedIn"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Channel partnership: Kinage as the recommended financial tool for the families her organization serves.",
    priority: "monitor",
  },

  // ── TIER 3 — Practitioner & Community ────────────────────────────────────
  {
    id: "james-lee",
    name: "James Lee",
    tier: 3,
    title: "Daily Money Manager · AADMM Member",
    domains: ["Daily Money Management", "Professional Channel", "Bill Execution"],
    whyAligned:
      "Practitioner in the DMM professional channel. Direct match for Kinage's B2B user profile — someone who manages bills for aging clients daily.",
    platforms: ["LinkedIn"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Practitioner tool adoption: Kinage as a workflow upgrade for DMMs. Offer early access and ask for honest feedback.",
    priority: "monitor",
  },
  {
    id: "nicole-will",
    name: "Nicole Will",
    tier: 3,
    title: "Aging Life Care Manager · ALCA Member",
    domains: ["Geriatric Care Management", "Family Coordination", "Tool Referral"],
    whyAligned:
      "Aging life care manager who refers tools to families at the exact moment they need Kinage.",
    platforms: ["LinkedIn", "Instagram"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Tool referral relationship: position Kinage as what she recommends to families when financial coordination becomes a crisis point.",
    priority: "monitor",
  },
  {
    id: "jessica-guthrie",
    name: "Jessica Guthrie",
    tier: 3,
    title: "Caregiver Advocate · Community Voice",
    domains: ["Caregiver Burnout", "Community Signal", "Peer Influence"],
    whyAligned:
      "Active community voice in caregiver support spaces. Authentic peer-level signal that reaches families who distrust institutional messaging.",
    platforms: ["Instagram", "Blog"],
    platformHandles: { Instagram: "@careercaregivingcollide" },
    outreachStatus: "Monitoring",
    suggestedAngle:
      "Peer endorsement: authentic caregiver voice sharing real tool use. Provide a genuine experience — no scripted testimonial.",
    priority: "monitor",
  },
  {
    id: "lance-slatton",
    name: "Lance Slatton",
    tier: 3,
    title: "Caregiver Podcast Host · Author",
    domains: ["Caregiver Support", "Thought Leadership", "Podcast Reach"],
    whyAligned:
      "Podcast reach into active caregiver community. Guest opportunity for Rick to tell the Kinage story to a warm, mission-aligned audience.",
    platforms: ["Podcast", "LinkedIn", "YouTube"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Podcast guest pitch: Rick on elder financial protection and the family coordination gap. Story-first, Kinage emerges naturally.",
    priority: "soon",
  },
  {
    id: "tina-sadarangani",
    name: "Dr. Tina Sadarangani",
    tier: 3,
    title: "NYU Geriatric Nurse Practitioner · Researcher",
    domains: ["Cognitive Decline", "Geriatric Care", "Clinical Voice"],
    whyAligned:
      "Academic and clinical voice on aging vulnerability with growing public presence. Adds clinical credibility to Kinage's evidence base.",
    platforms: ["LinkedIn", "Blog"],
    outreachStatus: "Not Started",
    suggestedAngle:
      "Research alignment: clinical tools that map to financial vulnerability prevention. Kinage as the consumer layer of what her research recommends.",
    priority: "monitor",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_LABELS: Record<Tier, string> = {
  1: "Highest Alignment",
  2: "Institutional & Policy",
  3: "Practitioner & Community",
};

export const STATUS_META: Record<OutreachStatus, { color: string; bg: string }> = {
  "Not Started": { color: "#4a6a80", bg: "rgba(74,106,128,0.12)"  },
  "Monitoring":  { color: "#f5c518", bg: "rgba(245,197,24,0.1)"   },
  "Contacted":   { color: "#4a90d9", bg: "rgba(74,144,217,0.1)"   },
  "Engaged":     { color: "#4caf8a", bg: "rgba(76,175,138,0.1)"   },
};
