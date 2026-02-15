import { z } from "zod";

// ── Extractor output schema ──
const RecommendationSchema = z.object({
  provider: z.string().optional(),
  product: z.string().optional(),
  cover_type: z.string(),
  sum_insured: z.string().optional(),
  premium: z.string().optional(),
  frequency: z.string().optional(),
  term: z.string().optional(),
  notes: z.string().optional(),
});

const AlternativeSchema = z.object({
  provider: z.string(),
  premium: z.string().optional(),
  notes: z.string().optional(),
});

const SectionSchema = z.object({
  included: z.boolean(),
  summary_points: z.array(z.string()).default([]),
  recommendations: z.array(RecommendationSchema).default([]),
  alternatives_considered: z.array(AlternativeSchema).default([]),
  evidence_quotes: z.array(z.string()).default([]),
});

export const ExtractedJsonSchema = z.object({
  client: z.object({
    name: z.string().optional(),
    name_b: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    has_existing_cover_a: z.boolean().default(false),
    has_existing_cover_b: z.boolean().default(false),
  }),
  doc_type: z.enum(["SOA", "ROA", "SOE"]),
  sections: z.object({
    life: SectionSchema.optional(),
    trauma: SectionSchema.optional(),
    tpd: SectionSchema.optional(),
    income_protection: SectionSchema.optional(),
    health: SectionSchema.optional(),
    mortgage: SectionSchema.optional(),
    business: SectionSchema.optional(),
    kiwisaver: SectionSchema.optional(),
    other: SectionSchema.optional(),
  }),
  existing_cover: z.object({
    insurer: z.string().optional(),
    covers: z.record(z.string(), z.string()).optional(),
    premium: z.string().optional(),
  }).optional(),
  new_cover: z.object({
    insurer: z.string().optional(),
    covers: z.record(z.string(), z.string()).optional(),
    premium: z.string().optional(),
  }).optional(),
  compliance: z.object({
    assumptions: z.array(z.string()).default([]),
    limitations: z.array(z.string()).default([]),
    disclosures: z.array(z.string()).default([]),
  }).optional(),
  unknowns: z.array(z.string()).default([]),
  deviations: z.array(z.string()).default([]),
});

export type ExtractedJson = z.infer<typeof ExtractedJsonSchema>;

// ── Writer output schema ──
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
    client_email: z.string().optional(),
  }).optional(),
});

export type WriterOutput = z.infer<typeof WriterOutputSchema>;
