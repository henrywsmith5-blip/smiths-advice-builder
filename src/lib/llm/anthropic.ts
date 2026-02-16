import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ExtractInput } from "./provider";
import { ExtractedJsonSchema, WriterOutputSchema } from "./schemas";
import type { ExtractedJson, WriterOutput } from "./schemas";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5-20250929";

function buildExtractPrompt(input: ExtractInput): string {
  const isROA = input.docType === "ROA";

  // Build the prompt with Additional Context FIRST as primary source
  let prompt = `You are a data extraction specialist for Smiths Insurance & KiwiSaver, a New Zealand financial advice provider.

TASK: Extract structured data from the provided documents into the EXACT JSON format below.
DOCUMENT TYPE: ${input.docType} (${isROA ? "Record of Advice - what was IMPLEMENTED" : "Statement of Advice - what is being RECOMMENDED"})

CRITICAL RULES:
1. NEVER invent or guess numbers. If not explicitly stated, use null.
2. All monetary values should include "$" formatted as they appear (e.g. "$500,000", "$145.20").
3. If a value cannot be found, use null and ADD it to "missing_fields".
4. If "Additional Context" contains structured cover blocks (e.g. "Daniel: Life: $200,000 Premium: $68.49 per fortnight"), those values MUST be treated as AUTHORITATIVE. Extract them exactly as written.
5. When both transcript discussion and structured cover blocks exist, STRUCTURED BLOCKS TAKE PRECEDENCE for all numerical values.
6. If there are two clients (partner case), extract data separately for client_a and client_b.
7. Never ignore structured data inside Additional Context.

=== UI STRUCTURE FLAGS ===
isPartner: ${!!input.clientOverrides?.nameB}
clientA_hasExistingCover: check documents

YOU MUST RETURN THIS EXACT JSON STRUCTURE:
{
  "client": {
    "name_a": "First client full name or null",
    "name_b": "Second client full name or null (partner cases only)",
    "email": "Client email or null",
    "phone": "Client phone or null"
  },
  "doc_type": "${input.docType}",
  "sections_included": {
    "life": true,
    "trauma": true,
    "tpd": true,
    "income_protection": true,
    "mortgage_protection": true,
    "accidental_injury": true,
    "health": false
  },
  "client_a_existing_insurer": "Chubb or null",
  "client_a_new_insurer": "Fidelity Life or null",
  "client_a_old_cover": {
    "life": "$100,000 or null",
    "trauma": "null",
    "tpd": "null",
    "income_protection": "null",
    "mortgage_protection": "null",
    "accidental_injury": "null",
    "premium_cover": "null",
    "health": "null"
  },
  "client_a_new_cover": {
    "life": "$200,000",
    "trauma": "$150,000",
    "tpd": "$150,000",
    "income_protection": "$5,500/month",
    "mortgage_protection": "$3,200/month",
    "accidental_injury": "$150,000",
    "premium_cover": "Included",
    "health": "null"
  },
  "client_b_existing_insurer": "Chubb or null",
  "client_b_new_insurer": "Fidelity Life or null",
  "client_b_old_cover": { "life": "$100,000", "trauma": null, "tpd": null, "income_protection": null, "mortgage_protection": null, "accidental_injury": null, "premium_cover": null, "health": null },
  "client_b_new_cover": { "life": "$200,000", "trauma": "$120,000", "tpd": "$120,000", "income_protection": "$4,000/month", "mortgage_protection": null, "accidental_injury": null, "premium_cover": "Included", "health": null },
  "premium": {
    "existing_total": "$60.64 per fortnight",
    "new_total": "$107.34 per fortnight",
    "frequency": "per fortnight",
    "savings": null,
    "annual_savings": null
  },
  "benefits": {
    "mortgage_protection": { "monthly_amount": "$3,200", "wait_period": "4 weeks", "benefit_period": "5 years", "premium": null },
    "income_protection": { "monthly_amount": "$5,500", "wait_period": "4 weeks", "benefit_period": "To age 65", "premium": null }
  },
  "benefits_b": {
    "mortgage_protection": { "monthly_amount": null, "wait_period": null, "benefit_period": null, "premium": null },
    "income_protection": { "monthly_amount": "$4,000", "wait_period": "4 weeks", "benefit_period": "5 years", "premium": null }
  },
  "situation_summary": "Brief summary...",
  "special_instructions": "Client objectives...",
  "missing_fields": []
}

IMPORTANT: Return ONLY the JSON object. No markdown code fences. No explanation. Just the raw JSON starting with { and ending with }.`;

  // === ADDITIONAL CONTEXT GOES FIRST (PRIMARY SOURCE) ===
  if (input.additionalContext) {
    prompt += `\n\n=== ADDITIONAL CONTEXT (PRIMARY AUTHORITATIVE SOURCE - extract ALL data from this first) ===\n${input.additionalContext}`;
  }

  // === Other sources ===
  if (input.clientOverrides?.name) {
    prompt += `\n\n=== CLIENT NAME OVERRIDES ===\nClient A: ${input.clientOverrides.name}`;
    if (input.clientOverrides.nameB) prompt += `\nClient B: ${input.clientOverrides.nameB}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }

  if (input.firefliesText) {
    prompt += `\n\n=== MEETING TRANSCRIPT ===\n${input.firefliesText.substring(0, 80000)}`;
  }

  if (input.quotesText) {
    prompt += `\n\n=== INSURANCE QUOTES / SCHEDULES ===\n${input.quotesText.substring(0, 80000)}`;
  }

  if (input.otherDocsText) {
    prompt += `\n\n=== OTHER DOCUMENTS ===\n${input.otherDocsText.substring(0, 40000)}`;
  }

  if (input.roaDeviations) {
    prompt += `\n\n=== DEVIATIONS ===\n${input.roaDeviations.substring(0, 30000)}`;
  }

  return prompt;
}

function buildWriterPrompt(extractedJson: ExtractedJson, docType: string): string {
  const isROA = docType === "ROA";
  const tense = isROA ? "PAST tense (was implemented, was arranged)" : "FUTURE tense (we recommend, will provide)";

  return `You are Craig Smith, a professional NZ financial adviser writing for Smiths Insurance & KiwiSaver.

TASK: Write polished HTML content sections for a ${docType} (${isROA ? "Record of Advice" : "Statement of Advice"}).

TENSE: ALL narrative must be in ${tense}.
TONE: Professional NZ financial adviser. Concise, clear, authoritative. Mid-formal - professional but accessible.
FORMAT: Return HTML fragments ONLY - use <p>, <ul>, <li>, <strong>, <em>. No <html>, <body>, <head>.

RULES:
1. NEVER invent numbers. Use ONLY what is in the data below.
2. If a section is not included (sections_included = false), return { "included": false, "html": "" }
3. Keep paragraphs 2-4 sentences. Use bullet lists for comparisons.
4. For pros/cons: write 3-5 bullet points each as <ul><li> lists.
5. For reasons: explain WHY tied to the client's specific situation (mortgage, family, income).
6. Use NZ English spelling (favour, analyse, organise).
7. Address client as "you" / "your". Use "I" for personal actions. "we" for firm scope.
8. NEVER use the em dash character (\u2014). It is strictly banned. Use a normal hyphen (-) or rewrite the sentence instead.

EXTRACTED DATA:
${JSON.stringify(extractedJson, null, 2)}

Return JSON with "sections" object. Each key maps to { "included": boolean, "html": "..." }.

SECTION KEYS:
- "special_instructions": Client objectives narrative (purpose of meeting, current situation, what they want, recommendation, reasoning)
- "reasons_life", "reasons_trauma", "reasons_progressive_care", "reasons_tpd", "reasons_income_mortgage", "reasons_aic", "reasons_health"
- "pros_life", "cons_life", "pros_trauma", "cons_trauma", "pros_tpd", "cons_tpd", "pros_income_mp", "cons_income_mp", "pros_aic", "cons_aic"
- "modification_notes", "summary"

Also return "meta" with "document_title" and "client_name".

Return ONLY valid JSON. No markdown.`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Normalize any JSON structure into the flat ExtractedJson format */
function normalizeFactPack(raw: any, docType: string): ExtractedJson {
  const g = (obj: any, ...keys: string[]): any => {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
  };

  const normCover = (obj: any): any => {
    if (!obj) return { life: null, trauma: null, tpd: null, income_protection: null, mortgage_protection: null, accidental_injury: null, premium_cover: null, health: null };
    return {
      life: g(obj, "life", "Life", "life_cover") ?? null,
      trauma: g(obj, "trauma", "Trauma", "progressive_care", "critical") ?? null,
      tpd: g(obj, "tpd", "TPD", "total_permanent_disability") ?? null,
      income_protection: g(obj, "income_protection", "income", "ip", "Income Protection", "incomeProtection") ?? null,
      mortgage_protection: g(obj, "mortgage_protection", "mortgage", "mp", "Mortgage Protection", "mortgageProtection") ?? null,
      accidental_injury: g(obj, "accidental_injury", "accident", "aic", "accidentalInjury", "Accidental Injury") ?? null,
      premium_cover: g(obj, "premium_cover", "premiumCover", "Premium Cover") ?? null,
      health: g(obj, "health", "Health") ?? null,
    };
  };

  const client = g(raw, "client") || {};
  const si = g(raw, "sections_included", "sectionsIncluded") || {};
  const prem = g(raw, "premium", "premiumComparison", "premium_comparison") || {};
  const ben = g(raw, "benefits", "benefitsSummary") || {};

  const result: any = {
    client: {
      name_a: g(client, "name_a", "nameA", "name", "fullName") ?? g(raw, "client_a_name") ?? null,
      name_b: g(client, "name_b", "nameB") ?? g(raw, "client_b_name") ?? null,
      email: g(client, "email") ?? null,
      phone: g(client, "phone") ?? null,
    },
    doc_type: g(raw, "doc_type", "docType") || docType,
    sections_included: {
      life: !!g(si, "life", "lifeInsurance", "life_insurance"),
      trauma: !!g(si, "trauma", "traumaInsurance", "trauma_insurance"),
      tpd: !!g(si, "tpd", "tpdInsurance", "tpd_insurance"),
      income_protection: !!g(si, "income_protection", "incomeProtection", "income"),
      mortgage_protection: !!g(si, "mortgage_protection", "mortgageProtection", "mortgage"),
      accidental_injury: !!g(si, "accidental_injury", "accidentalInjury", "accident"),
      health: !!g(si, "health", "healthInsurance"),
    },
    client_a_existing_insurer: g(raw, "client_a_existing_insurer", "clientAExistingInsurer") ?? null,
    client_a_new_insurer: g(raw, "client_a_new_insurer", "clientANewInsurer") ?? null,
    client_a_old_cover: normCover(g(raw, "client_a_old_cover", "clientAOldCover")),
    client_a_new_cover: normCover(g(raw, "client_a_new_cover", "clientANewCover")),
    client_b_existing_insurer: g(raw, "client_b_existing_insurer", "clientBExistingInsurer") ?? null,
    client_b_new_insurer: g(raw, "client_b_new_insurer", "clientBNewInsurer") ?? null,
    client_b_old_cover: normCover(g(raw, "client_b_old_cover", "clientBOldCover")),
    client_b_new_cover: normCover(g(raw, "client_b_new_cover", "clientBNewCover")),
    premium: {
      existing_total: g(prem, "existing_total", "existingTotal", "old_premium", "oldPremium") ?? null,
      new_total: g(prem, "new_total", "newTotal", "new_premium", "newPremium") ?? null,
      frequency: g(prem, "frequency") || "per month",
      savings: g(prem, "savings", "monthly_savings") ?? null,
      annual_savings: g(prem, "annual_savings", "annualSavings") ?? null,
    },
    benefits: {
      mortgage_protection: {
        monthly_amount: g(g(ben, "mortgage_protection", "mortgageProtection", "mp"), "monthly_amount", "monthlyAmount") ?? null,
        wait_period: g(g(ben, "mortgage_protection", "mortgageProtection", "mp"), "wait_period", "waitPeriod") ?? null,
        benefit_period: g(g(ben, "mortgage_protection", "mortgageProtection", "mp"), "benefit_period", "benefitPeriod") ?? null,
        premium: g(g(ben, "mortgage_protection", "mortgageProtection", "mp"), "premium") ?? null,
      },
      income_protection: {
        monthly_amount: g(g(ben, "income_protection", "incomeProtection", "ip"), "monthly_amount", "monthlyAmount") ?? null,
        wait_period: g(g(ben, "income_protection", "incomeProtection", "ip"), "wait_period", "waitPeriod") ?? null,
        benefit_period: g(g(ben, "income_protection", "incomeProtection", "ip"), "benefit_period", "benefitPeriod") ?? null,
        premium: g(g(ben, "income_protection", "incomeProtection", "ip"), "premium") ?? null,
      },
    },
    // Client B benefits
    benefits_b: (() => {
      const benB = g(raw, "benefits_b", "benefitsB", "benefits_client_b") || {};
      return {
        mortgage_protection: {
          monthly_amount: g(g(benB, "mortgage_protection", "mortgageProtection", "mp"), "monthly_amount", "monthlyAmount") ?? null,
          wait_period: g(g(benB, "mortgage_protection", "mortgageProtection", "mp"), "wait_period", "waitPeriod") ?? null,
          benefit_period: g(g(benB, "mortgage_protection", "mortgageProtection", "mp"), "benefit_period", "benefitPeriod") ?? null,
          premium: g(g(benB, "mortgage_protection", "mortgageProtection", "mp"), "premium") ?? null,
        },
        income_protection: {
          monthly_amount: g(g(benB, "income_protection", "incomeProtection", "ip"), "monthly_amount", "monthlyAmount") ?? null,
          wait_period: g(g(benB, "income_protection", "incomeProtection", "ip"), "wait_period", "waitPeriod") ?? null,
          benefit_period: g(g(benB, "income_protection", "incomeProtection", "ip"), "benefit_period", "benefitPeriod") ?? null,
          premium: g(g(benB, "income_protection", "incomeProtection", "ip"), "premium") ?? null,
        },
      };
    })(),
    situation_summary: g(raw, "situation_summary", "situationSummary") ?? null,
    special_instructions: g(raw, "special_instructions", "specialInstructions") ?? null,
    missing_fields: g(raw, "missing_fields", "missingFields") || [],
  };

  return result as ExtractedJson;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class AnthropicProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<ExtractedJson> {
    const prompt = buildExtractPrompt(input);
    console.log(`[Anthropic] Extractor: model=${MODEL}, prompt=${prompt.length} chars`);

    let response;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Anthropic] API CALL FAILED: ${msg}`);
      throw new Error(`Anthropic API failed: ${msg}`);
    }

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    console.log(`[Anthropic] Extractor response: ${text.length} chars`);

    if (text.length < 10) {
      console.error("[Anthropic] Response too short:", text);
      throw new Error("Anthropic returned empty response");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Anthropic] No JSON in response. First 500:", text.substring(0, 500));
      throw new Error("No JSON found in extractor response");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[Anthropic] JSON parse failed. Raw:", jsonMatch[0].substring(0, 500));
      throw new Error("Invalid JSON from extractor");
    }

    console.log(`[Anthropic] Parsed keys: ${Object.keys(parsed).join(", ")}`);
    console.log(`[Anthropic] client.name_a: ${(parsed.client as Record<string, unknown>)?.name_a}`);

    // Try strict Zod first
    const result = ExtractedJsonSchema.safeParse(parsed);
    if (result.success) {
      console.log("[Anthropic] Strict schema parse OK");
      return result.data;
    }

    console.warn(`[Anthropic] Strict parse failed: ${result.error.issues.slice(0, 3).map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`);

    // Forgiving normalizer
    console.log("[Anthropic] Using forgiving normalizer...");
    const normalized = normalizeFactPack(parsed, input.docType);
    console.log(`[Anthropic] Normalized: clientA=${normalized.client.name_a}, clientB=${normalized.client.name_b}, existInsurer=${normalized.client_a_existing_insurer}`);
    return normalized;
  }

  async writeSections(extractedJson: ExtractedJson, docType: string): Promise<WriterOutput> {
    const prompt = buildWriterPrompt(extractedJson, docType);
    console.log(`[Anthropic] Writer: ${prompt.length} chars`);

    let response;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        temperature: 0.25,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Anthropic] Writer API FAILED: ${msg}`);
      throw new Error(`Writer API failed: ${msg}`);
    }

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    console.log(`[Anthropic] Writer response: ${text.length} chars`);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Anthropic] No JSON in writer response");
      throw new Error("No JSON in writer response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result = WriterOutputSchema.safeParse(parsed);

    if (result.success) return result.data;

    console.warn("[Anthropic] Writer validation issues:", result.error.issues.slice(0, 3));
    return { sections: parsed.sections || {}, meta: parsed.meta || { document_title: `${docType} Document` } };
  }
}
