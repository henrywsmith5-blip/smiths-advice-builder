import { z } from "zod";

// ══════════════════════════════════════════════════════════════
// KIWISAVER FACT PACK — extracted by LLM, validated by Zod
// ══════════════════════════════════════════════════════════════

const ScopeSelectionsSchema = z.object({
  riskProfile: z.boolean().default(true),
  fundReview: z.boolean().default(true),
  contributions: z.boolean().default(false),
  withdrawals: z.boolean().default(false),
  limitedAdvice: z.boolean().default(true),
});

const ProviderInfoSchema = z.object({
  provider: z.string().nullable().default(null),
  fund: z.string().nullable().default(null),
  balance: z.union([z.number(), z.string()]).nullable().default(null),
});

const RecommendedInfoSchema = z.object({
  provider: z.string().nullable().default(null),
  fund: z.string().nullable().default(null),
});

const ProjectionsSchema = z.object({
  projectedBalance: z.union([z.number(), z.string()]).nullable().default(null),
  projectedWeeklyIncome: z.union([z.number(), z.string()]).nullable().default(null),
  assumptions: z.string().nullable().default(null),
});

const KiwisaverClientSchema = z.object({
  id: z.enum(["A", "B"]).default("A"),
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  age: z.number().nullable().default(null),
  incomeAnnual: z.union([z.number(), z.string()]).nullable().default(null),
  employeeContrib: z.string().nullable().default(null),
  employerContrib: z.string().nullable().default(null),
  goal: z.string().nullable().default(null),
  timeframe: z.string().nullable().default(null),
  riskProfileOutcome: z.string().nullable().default(null),
  current: ProviderInfoSchema.default({ provider: null, fund: null, balance: null }),
  recommended: RecommendedInfoSchema.default({ provider: null, fund: null }),
  projections: ProjectionsSchema.default({
    projectedBalance: null,
    projectedWeeklyIncome: null,
    assumptions: null,
  }),
  scopeSelections: ScopeSelectionsSchema.default({
    riskProfile: true,
    fundReview: true,
    contributions: false,
    withdrawals: false,
    limitedAdvice: true,
  }),
});

const CaseMetaSchema = z.object({
  isPartner: z.boolean().default(false),
  adviceDate: z.string().default(""),
  meetingDate: z.string().nullable().default(null),
  dataAsAtDate: z.string().default(""),
  documentType: z.literal("KiwiSaver SOA").default("KiwiSaver SOA"),
});

const NarrativeInputsSchema = z.object({
  specialInstructionsHtml: z.string().nullable().default(null),
  recommendationSummaryParagraph: z.string().nullable().default(null),
  projectionsExplanationParagraph: z.string().nullable().default(null),
});

export const KiwisaverFactPackSchema = z.object({
  caseMeta: CaseMetaSchema.default({
    isPartner: false,
    adviceDate: "",
    meetingDate: null,
    dataAsAtDate: "",
    documentType: "KiwiSaver SOA",
  }),
  clients: z.array(KiwisaverClientSchema).min(1).default([{
    id: "A",
    name: null,
    email: null,
    phone: null,
    age: null,
    incomeAnnual: null,
    employeeContrib: null,
    employerContrib: null,
    goal: null,
    timeframe: null,
    riskProfileOutcome: null,
    current: { provider: null, fund: null, balance: null },
    recommended: { provider: null, fund: null },
    projections: { projectedBalance: null, projectedWeeklyIncome: null, assumptions: null },
    scopeSelections: { riskProfile: true, fundReview: true, contributions: false, withdrawals: false, limitedAdvice: true },
  }]),
  narrativeInputs: NarrativeInputsSchema.default({
    specialInstructionsHtml: null,
    recommendationSummaryParagraph: null,
    projectionsExplanationParagraph: null,
  }),
  missing_fields: z.array(z.string()).default([]),
});

export type KiwisaverFactPack = z.infer<typeof KiwisaverFactPackSchema>;
export type KiwisaverClient = z.infer<typeof KiwisaverClientSchema>;

// ══════════════════════════════════════════════════════════════
// PROVIDER DATA — fetched deterministically, never by LLM
// ══════════════════════════════════════════════════════════════

export interface ProviderData {
  provider: string;
  fund: string;
  fees: {
    fundFeePercent: string | null;
    adminFee: string | null;
    other: string | null;
  };
  performance: {
    oneYear: string | null;
    threeYear: string | null;
    fiveYear: string | null;
    sinceInception: string | null;
  };
  sources: {
    feesUrl: string;
    performanceUrl: string;
  };
  asAtDate: string;
}
