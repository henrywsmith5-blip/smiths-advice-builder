import { z } from "zod";

// ══════════════════════════════════════════════════════════════
// EXTRACTOR OUTPUT — maps directly to template variables
// ══════════════════════════════════════════════════════════════

const emptyCover = { life: null, trauma: null, tpd: null, income_protection: null, mortgage_protection: null, accidental_injury: null, premium_cover: null, health: null };
const emptyBenefit = { monthly_amount: null, wait_period: null, benefit_period: null, premium: null };

const CoverLineSchema = z.object({
  life: z.string().nullable().default(null),
  trauma: z.string().nullable().default(null),
  tpd: z.string().nullable().default(null),
  income_protection: z.string().nullable().default(null),
  mortgage_protection: z.string().nullable().default(null),
  accidental_injury: z.string().nullable().default(null),
  premium_cover: z.string().nullable().default(null),
  health: z.string().nullable().default(null),
});

const BenefitDetailSchema = z.object({
  monthly_amount: z.string().nullable().default(null),
  wait_period: z.string().nullable().default(null),
  benefit_period: z.string().nullable().default(null),
  premium: z.string().nullable().default(null),
});

export const ExtractedJsonSchema = z.object({
  // Client info
  client: z.object({
    name_a: z.string().nullable().default(null),
    name_b: z.string().nullable().default(null),
    email: z.string().nullable().default(null),
    phone: z.string().nullable().default(null),
  }),

  doc_type: z.enum(["SOA", "ROA", "SOE"]),

  // Which cover types are included
  sections_included: z.object({
    life: z.boolean().default(false),
    trauma: z.boolean().default(false),
    tpd: z.boolean().default(false),
    income_protection: z.boolean().default(false),
    mortgage_protection: z.boolean().default(false),
    accidental_injury: z.boolean().default(false),
    health: z.boolean().default(false),
  }),

  // Client A cover data
  client_a_existing_insurer: z.string().nullable().default(null),
  client_a_new_insurer: z.string().nullable().default(null),
  client_a_old_cover: CoverLineSchema.default(emptyCover),
  client_a_new_cover: CoverLineSchema.default(emptyCover),

  // Client B cover data (partner only)
  client_b_existing_insurer: z.string().nullable().default(null),
  client_b_new_insurer: z.string().nullable().default(null),
  client_b_old_cover: CoverLineSchema.default(emptyCover),
  client_b_new_cover: CoverLineSchema.default(emptyCover),

  // Premium summary
  premium: z.object({
    existing_total: z.string().nullable().default(null),
    new_total: z.string().nullable().default(null),
    frequency: z.string().default("per month"),
    savings: z.string().nullable().default(null),
    annual_savings: z.string().nullable().default(null),
  }).default({ existing_total: null, new_total: null, frequency: "per month", savings: null, annual_savings: null }),

  // Benefits — Client A (IP/MP details)
  benefits: z.object({
    mortgage_protection: BenefitDetailSchema.default(emptyBenefit),
    income_protection: BenefitDetailSchema.default(emptyBenefit),
  }).default({ mortgage_protection: emptyBenefit, income_protection: emptyBenefit }),

  // Benefits — Client B (partner only)
  benefits_b: z.object({
    mortgage_protection: BenefitDetailSchema.default(emptyBenefit),
    income_protection: BenefitDetailSchema.default(emptyBenefit),
  }).default({ mortgage_protection: emptyBenefit, income_protection: emptyBenefit }),

  // Situation / context extracted from transcript
  situation_summary: z.string().nullable().default(null),
  special_instructions: z.string().nullable().default(null),

  // Fields the AI could NOT find in the documents
  missing_fields: z.array(z.string()).default([]),
});

export type ExtractedJson = z.infer<typeof ExtractedJsonSchema>;

// ══════════════════════════════════════════════════════════════
// WRITER OUTPUT — section key → HTML fragment
// These keys map EXACTLY to the template {{ VARIABLES }}
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
