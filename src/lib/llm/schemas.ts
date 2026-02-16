import { z } from "zod";

// ══════════════════════════════════════════════════════════════
// FACT PACK SCHEMA — Per-client structure
// The LLM extracts facts ONLY. No totals, no savings, no structure decisions.
// ══════════════════════════════════════════════════════════════

const CoverEntrySchema = z.object({
  life: z.string().nullable().default(null),
  trauma: z.string().nullable().default(null),
  tpd: z.string().nullable().default(null),
  ip: z.string().nullable().default(null),
  mp: z.string().nullable().default(null),
  aic: z.string().nullable().default(null),
  premiumCover: z.string().nullable().default(null),
  health: z.string().nullable().default(null),
});

const emptyCover = { life: null, trauma: null, tpd: null, ip: null, mp: null, aic: null, premiumCover: null, health: null };

const PremiumEntrySchema = z.object({
  amount: z.number().nullable().default(null),
  frequency: z.enum(["fortnight", "month", "year"]).nullable().default(null),
});

const emptyPremium = { amount: null, frequency: null };

const BenefitEntrySchema = z.object({
  monthlyAmount: z.string().nullable().default(null),
  waitPeriod: z.string().nullable().default(null),
  benefitPeriod: z.string().nullable().default(null),
  premium: z.string().nullable().default(null),
});

const emptyBenefitEntry = { monthlyAmount: null, waitPeriod: null, benefitPeriod: null, premium: null };

const ClientSchema = z.object({
  id: z.enum(["A", "B"]),
  name: z.string().nullable().default(null),
  dob: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  occupation: z.string().nullable().default(null),
  smoker: z.boolean().nullable().default(null),
  income: z.string().nullable().default(null),

  existingCover: z.object({
    insurer: z.string().nullable().default(null),
    covers: CoverEntrySchema.default(emptyCover),
    premium: PremiumEntrySchema.default(emptyPremium),
  }).default({ insurer: null, covers: emptyCover, premium: emptyPremium }),

  implementedCover: z.object({
    insurer: z.string().nullable().default(null),
    covers: CoverEntrySchema.default(emptyCover),
    premium: PremiumEntrySchema.default(emptyPremium),
  }).default({ insurer: null, covers: emptyCover, premium: emptyPremium }),

  benefitsSummary: z.object({
    ip: BenefitEntrySchema.nullable().default(null),
    mp: BenefitEntrySchema.nullable().default(null),
  }).default({ ip: null, mp: null }),
});

export const FactPackSchema = z.object({
  caseMeta: z.object({
    frequency: z.enum(["fortnight", "month", "year"]).default("month"),
  }).default({ frequency: "month" }),

  clients: z.array(ClientSchema).default([]),

  sectionsIncluded: z.object({
    life: z.boolean().default(false),
    trauma: z.boolean().default(false),
    tpd: z.boolean().default(false),
    incomeProtection: z.boolean().default(false),
    mortgageProtection: z.boolean().default(false),
    accidentalInjury: z.boolean().default(false),
    health: z.boolean().default(false),
  }).default({ life: false, trauma: false, tpd: false, incomeProtection: false, mortgageProtection: false, accidentalInjury: false, health: false }),

  shared: z.object({
    address: z.string().nullable().default(null),
    mortgage: z.string().nullable().default(null),
    children: z.string().nullable().default(null),
    objectives: z.array(z.string()).default([]),
    specialInstructions: z.string().nullable().default(null),
    situationSummary: z.string().nullable().default(null),
  }).default({ address: null, mortgage: null, children: null, objectives: [], specialInstructions: null, situationSummary: null }),

  missingFields: z.array(z.string()).default([]),
});

export type FactPack = z.infer<typeof FactPackSchema>;
export type ClientData = z.infer<typeof ClientSchema>;

// Legacy alias for pipeline compatibility
export type ExtractedJson = FactPack;
export const ExtractedJsonSchema = FactPackSchema;

// ══════════════════════════════════════════════════════════════
// WRITER OUTPUT — section key → HTML fragment
// ══════════════════════════════════════════════════════════════

export const WriterOutputSchema = z.object({
  sections: z.record(
    z.string(),
    z.object({
      included: z.boolean(),
      html: z.string(),
    })
  ),
  meta: z.object({
    document_title: z.string().optional(),
    client_name: z.string().optional(),
  }).optional(),
});

export type WriterOutput = z.infer<typeof WriterOutputSchema>;
