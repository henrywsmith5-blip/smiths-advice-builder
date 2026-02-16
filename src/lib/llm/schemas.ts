import { z } from "zod";

// ══════════════════════════════════════════════════════════════
// FACT PACK SCHEMA — Detailed per-client structure matching
// Craig Smith advisory document corpus (Part 3 spec)
// ══════════════════════════════════════════════════════════════

const HealthDisclosureSchema = z.object({
  condition: z.string(),
  status: z.string().nullable().default(null), // current / resolved / managed
  details: z.string().nullable().default(null),
});

const LifestyleDisclosuresSchema = z.object({
  alcohol: z.string().nullable().default(null),
  drugs: z.string().nullable().default(null),
  highRiskActivities: z.string().nullable().default(null),
  familyHistory: z.string().nullable().default(null),
});

const emptyLifestyle = { alcohol: null, drugs: null, highRiskActivities: null, familyHistory: null };

const CoverItemSchema = z.object({
  coverType: z.string(), // Life, Trauma, Progressive Care, TPD, Income Protection, Mortgage Protection, Health, Accidental Injury, Premium Cover
  sumInsured: z.string().nullable().default(null),
  benefitPeriod: z.string().nullable().default(null),
  waitPeriod: z.string().nullable().default(null),
  excess: z.string().nullable().default(null),
  optionsIncluded: z.array(z.string()).default([]),
  buyback: z.boolean().nullable().default(null),
  notes: z.string().nullable().default(null),
});

const PremiumEntrySchema = z.object({
  amount: z.number().nullable().default(null),
  frequency: z.enum(["fortnight", "month", "year", "weekly"]).nullable().default(null),
});

const emptyPremium = { amount: null, frequency: null };

const BenefitEntrySchema = z.object({
  monthlyAmount: z.string().nullable().default(null),
  waitPeriod: z.string().nullable().default(null),
  benefitPeriod: z.string().nullable().default(null),
  premium: z.string().nullable().default(null),
});

const ScopePerClientSchema = z.object({
  clientName: z.string(),
  lifeInsurance: z.boolean().default(false),
  traumaInsurance: z.boolean().default(false),
  tpdInsurance: z.boolean().default(false),
  incomeProtection: z.boolean().default(false),
  redundancyCover: z.boolean().default(false),
  healthInsurance: z.boolean().default(false),
});

const ClientSchema = z.object({
  clientLabel: z.string().default("Client A"), // "Client A", "Client B", or "Client"
  fullName: z.string().nullable().default(null),
  dateOfBirth: z.string().nullable().default(null),
  age: z.number().nullable().default(null),
  gender: z.string().nullable().default(null),
  smokerStatus: z.string().nullable().default(null), // smoker / non-smoker / ex-smoker
  occupation: z.string().nullable().default(null),
  occupationClass: z.string().nullable().default(null),
  employer: z.string().nullable().default(null),
  hoursPerWeek: z.number().nullable().default(null),
  weeksPerYear: z.number().nullable().default(null),
  incomeGrossAnnual: z.number().nullable().default(null),
  incomeNetAnnual: z.number().nullable().default(null),
  selfEmployed: z.boolean().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  maritalStatus: z.string().nullable().default(null),
  dependants: z.string().nullable().default(null),
  mortgageAmount: z.number().nullable().default(null),
  otherDebts: z.string().nullable().default(null),
  kiwisaverProvider: z.string().nullable().default(null),
  kiwisaverBalance: z.string().nullable().default(null),
  healthDisclosures: z.array(HealthDisclosureSchema).default([]),
  lifestyleDisclosures: LifestyleDisclosuresSchema.default(emptyLifestyle),
  heightCm: z.number().nullable().default(null),
  weightKg: z.number().nullable().default(null),
  doctorName: z.string().nullable().default(null),
  doctorClinic: z.string().nullable().default(null),
});

const ExistingCoverBlockSchema = z.object({
  clientName: z.string(),
  insurer: z.string().nullable().default(null),
  policyNumber: z.string().nullable().default(null),
  covers: z.array(CoverItemSchema).default([]),
  totalPremium: z.string().nullable().default(null), // e.g. "$37.96 per fortnight"
  premiumAmount: z.number().nullable().default(null), // raw number for computation
  premiumFrequency: z.string().nullable().default(null),
  action: z.string().nullable().default(null), // cancel / retain / modify / convert
});

const RecommendedCoverBlockSchema = z.object({
  clientName: z.string(),
  insurer: z.string().nullable().default(null),
  covers: z.array(CoverItemSchema).default([]),
  totalPremium: z.string().nullable().default(null),
  premiumAmount: z.number().nullable().default(null),
  premiumFrequency: z.string().nullable().default(null),
});

export const FactPackSchema = z.object({
  documentMetadata: z.object({
    adviserName: z.string().default("Craig Smith"),
    adviserFapLicence: z.string().default("33042"),
    fapEntity: z.string().default("Craig Smith Business Services Limited"),
    fapLicenceNumber: z.string().default("712931"),
    tradingName: z.string().default("Smiths Insurance and KiwiSaver"),
    documentDate: z.string().nullable().default(null),
    signOffDate: z.string().nullable().default(null),
  }).default({
    adviserName: "Craig Smith", adviserFapLicence: "33042",
    fapEntity: "Craig Smith Business Services Limited", fapLicenceNumber: "712931",
    tradingName: "Smiths Insurance and KiwiSaver", documentDate: null, signOffDate: null,
  }),

  clients: z.array(ClientSchema).default([]),

  scopeOfAdvice: z.object({
    isLimitedAdvice: z.boolean().default(false),
    perClient: z.array(ScopePerClientSchema).default([]),
  }).default({ isLimitedAdvice: false, perClient: [] }),

  specialInstructions: z.string().nullable().default(null),

  existingCover: z.array(ExistingCoverBlockSchema).default([]),

  recommendedCover: z.array(RecommendedCoverBlockSchema).default([]),

  premiumComparison: z.object({
    oldPremium: z.string().nullable().default(null),
    oldInsurer: z.string().nullable().default(null),
    newPremium: z.string().nullable().default(null),
    newInsurer: z.string().nullable().default(null),
    premiumChangeReason: z.string().nullable().default(null),
  }).default({ oldPremium: null, oldInsurer: null, newPremium: null, newInsurer: null, premiumChangeReason: null }),

  insurerSelectionReasoning: z.array(z.string()).default([]),

  replacementConsiderations: z.object({
    isReplacement: z.boolean().default(false),
    oldInsurer: z.string().nullable().default(null),
    risksDiscussed: z.boolean().default(false),
    clientConfirmedUnderstanding: z.boolean().default(false),
  }).default({ isReplacement: false, oldInsurer: null, risksDiscussed: false, clientConfirmedUnderstanding: false }),

  adviceTypeFlags: z.object({
    isNewCover: z.boolean().default(false),
    isCoverIncrease: z.boolean().default(false),
    isCoverReduction: z.boolean().default(false),
    isInsurerSwitch: z.boolean().default(false),
    isCoverConversion: z.boolean().default(false),
    isAnnualReview: z.boolean().default(false),
    noAdviceOnAmount: z.boolean().default(false),
  }).default({ isNewCover: false, isCoverIncrease: false, isCoverReduction: false, isInsurerSwitch: false, isCoverConversion: false, isAnnualReview: false, noAdviceOnAmount: false }),

  productDetailsToInclude: z.array(z.string()).default([]),

  // Per-client benefits summary (for IP/MP table)
  benefitsSummaryA: z.object({
    ip: BenefitEntrySchema.nullable().default(null),
    mp: BenefitEntrySchema.nullable().default(null),
  }).default({ ip: null, mp: null }),

  benefitsSummaryB: z.object({
    ip: BenefitEntrySchema.nullable().default(null),
    mp: BenefitEntrySchema.nullable().default(null),
  }).default({ ip: null, mp: null }),

  missingFields: z.array(z.string()).default([]),
});

export type FactPack = z.infer<typeof FactPackSchema>;
export type ClientData = z.infer<typeof ClientSchema>;
export type CoverItem = z.infer<typeof CoverItemSchema>;

// Legacy aliases
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
