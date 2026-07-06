/** Reference data from DRAFT PMDF.xlsx (Grid + Evaluation Form sheets). */

export const PMDF_FUNCTIONAL_AREAS = [
  "Sales",
  "Operations",
  "Supply Chain",
  "Trader",
  "HR/IR",
  "MIS",
  "Finance",
  "Audit",
] as const;

export const PMDF_LOCATION_CATEGORIES = ["Dubai Office", "Karachi Office", "Multan Office"] as const;

export type PmdfFunctionalArea = (typeof PMDF_FUNCTIONAL_AREAS)[number];
export type PmdfLocationCategory = (typeof PMDF_LOCATION_CATEGORIES)[number];

export const PMDF_PILLARS = [
  "Empathy",
  "Accountability",
  "Initiative",
  "Collaboration",
  "Integrity",
] as const;

export type PmdfPillar = (typeof PMDF_PILLARS)[number];

export const BUSINESS_OBJECTIVE_RATINGS = [
  { code: "LP", scale: 1, label: "Low Performance (LP)" },
  { code: "BE", scale: 2, label: "Below Expectations (BE)" },
  { code: "ME", scale: 3, label: "Meet Expectation (ME)" },
  { code: "EE", scale: 4, label: "Exceeds Expectations (EE)" },
  { code: "OP", scale: 5, label: "Outstanding Performance (OP)" },
] as const;

export const DEVELOPMENT_OBJECTIVE_RATINGS = [
  { code: "NE", scale: 1, label: "No Effort (No change)" },
  { code: "SE", scale: 2, label: "Some Effort (No change)" },
  { code: "EE", scale: 3, label: "Enough Effort (Positive change in behaviour)" },
  { code: "XE", scale: 4, label: "Extra Effort (Change in behaviour)" },
  { code: "SS", scale: 5, label: "Success Story (Permanent change in behaviour)" },
] as const;

export const BUSINESS_RATING_BANDS = [
  {
    label: "Low Performance (LP)",
    from: 0,
    till: 1.99,
    note: "Leads toward immediate separation",
    description:
      "The employee was consistently below job performance and behavioural competency standards when measured by quality, quantity, and value to the Company. Immediate corrective action is necessary.",
  },
  {
    label: "Below Expectations (BE)",
    from: 2,
    till: 2.89,
    note: "Need to Start PIP (Not Eligible for Annual Increment)",
    description:
      "The employee is still developing and/or did not consistently achieve job performance and behavioural competency standards. Some improvement is needed.",
  },
  {
    label: "Successful Performance (SP)",
    from: 2.9,
    till: 3.69,
    note: "",
    description:
      "The employee met job performance and behavioural competency standards and was consistent and reliable. The most critical annual goals were met.",
  },
  {
    label: "Exceeds Expectations (EE)",
    from: 3.7,
    till: 4.19,
    note: "",
    description:
      "The employee frequently surpassed job performance and behavioural competency standards and created value to the Company. All goals, objectives and targets were achieved above the established standards.",
  },
  {
    label: "Outstanding Performance (OP)",
    from: 4.2,
    till: 5,
    note: "",
    description: "The employee created a success story by setting real-time achievement.",
  },
] as const;

export const PMDF_PHASES = [
  { id: "objective_setting_employee", label: "Objective Setting (Employee)" },
  { id: "objective_setting_manager", label: "Objective Setting (Manager)" },
  { id: "mid_year_review_employee", label: "Mid Year Review (Employee)" },
  { id: "mid_year_review_manager", label: "Mid Year Review (Manager)" },
  { id: "year_end_evaluation_employee", label: "Year End Evaluation (Employee)" },
  { id: "year_end_evaluation_manager", label: "Year End Evaluation (Manager)" },
  { id: "calibration", label: "Calibration" },
  { id: "finalization", label: "Finalization" },
  { id: "closed", label: "Closed" },
] as const;

export type PmdfPhaseId = (typeof PMDF_PHASES)[number]["id"];

export const PILLAR_DEFINITIONS: Record<
  PmdfPillar,
  { developmentArea: string; achievementLevels: string }
> = {
  Empathy: {
    developmentArea: "Improving customer service (internal & external).",
    achievementLevels:
      "1. Actively listens and responds to stakeholder needs with tailored solutions.\n2. Maintains professionalism in all communications.\n3. Anticipates potential issues and addresses them proactively.\n4. Builds trust through consistent follow-through on commitments.\n5. Seeks feedback to improve service delivery.",
  },
  Accountability: {
    developmentArea: "Driving performance and fostering a positive work environment.",
    achievementLevels:
      "1. Sets clear expectations and provides actionable feedback.\n2. Addresses performance gaps with structured support (e.g., coaching).\n3. Promotes work-life balance and employee well-being.\n4. Encourages team collaboration and knowledge sharing.\n5. Champions organisational changes effectively.",
  },
  Initiative: {
    developmentArea: "Strengthening cross-functional relationships.",
    achievementLevels:
      "1. Collaborates seamlessly across departments.\n2. Shares resources and information transparently.\n3. Resolves conflicts constructively to maintain team harmony.\n4. Builds trust through reliability and integrity.\n5. Proposes solutions to improve teamwork.",
  },
  Collaboration: {
    developmentArea: "Promoting inclusivity and diversity of thoughts.",
    achievementLevels:
      "1. Treats all people with dignity, civility, and fairness.\n2. Ensures all voices are heard in meetings and projects.\n3. Seeks and values the opinions and contributions of others.\n4. Acknowledges ideas from others, even when different from own.\n5. Seeks to ensure all sides are heard before reaching a conclusion.\n6. Works diligently to foster an open and inclusive environment.",
  },
  Integrity: {
    developmentArea: "Upholding ethical standards and ownership of actions.",
    achievementLevels:
      "1. Models honesty and transparency in all interactions.\n2. Admits mistakes and takes corrective action.\n3. Prioritises safety, compliance, and resource stewardship.\n4. Completes mandatory training and advocates for ethical practices.\n5. Recognised as a trusted advisor by peers and leaders.",
  },
};

export function defaultDevelopmentRows(): Array<{
  pillar: PmdfPillar;
  developmentArea: string;
}> {
  return PMDF_PILLARS.map((pillar) => ({
    pillar,
    developmentArea: PILLAR_DEFINITIONS[pillar].developmentArea,
  }));
}

export function phaseLabel(phase: PmdfPhaseId): string {
  return PMDF_PHASES.find((p) => p.id === phase)?.label ?? phase;
}
