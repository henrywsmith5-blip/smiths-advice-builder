import OpenAI from "openai";
import type { LLMProvider, ExtractInput } from "./provider";
import { ExtractedJsonSchema, WriterOutputSchema } from "./schemas";
import type { ExtractedJson, WriterOutput } from "./schemas";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

// Reuse the same prompt logic as Anthropic for consistency
function buildExtractPrompt(input: ExtractInput): string {
  const isROA = input.docType === "ROA";
  let prompt = `You are a data extraction specialist for Smiths Insurance & KiwiSaver, a New Zealand financial advice provider.
TASK: Extract structured data from insurance documents into precise JSON.
DOCUMENT TYPE: ${input.docType} (${isROA ? "Record of Advice — what was IMPLEMENTED" : "Statement of Advice — what is being RECOMMENDED"})

RULES:
1. NEVER invent numbers. If not explicitly stated, use null.
2. Monetary values include "$" (e.g. "$500,000", "$145.20").
3. Missing values → null + add to "missing_fields" array.
4. Prefer formal quotes/schedules for amounts over transcript.
5. Partner cases: extract client_a and client_b separately.

Return JSON with: client, doc_type, sections_included, client_a_old_cover, client_a_new_cover, client_b_old_cover, client_b_new_cover, premium, benefits, situation_summary, special_instructions, missing_fields.
Each cover object has: life, trauma, tpd, income_protection, mortgage_protection, accidental_injury, premium_cover, health.`;

  if (input.clientOverrides?.name) {
    prompt += `\n\n=== CLIENT ===\nA: ${input.clientOverrides.name}`;
    if (input.clientOverrides.nameB) prompt += `\nB: ${input.clientOverrides.nameB}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }
  if (input.firefliesText) prompt += `\n\n=== TRANSCRIPT ===\n${input.firefliesText.substring(0, 60000)}`;
  if (input.quotesText) prompt += `\n\n=== QUOTES (primary source for numbers) ===\n${input.quotesText.substring(0, 60000)}`;
  if (input.otherDocsText) prompt += `\n\n=== OTHER DOCS ===\n${input.otherDocsText.substring(0, 30000)}`;
  if (input.additionalContext) prompt += `\n\n=== ADVISER NOTES / ADDITIONAL CONTEXT (PRIMARY SOURCE) ===\n${input.additionalContext.substring(0, 60000)}`;
  if (input.roaDeviations) prompt += `\n\n=== DEVIATIONS ===\n${input.roaDeviations.substring(0, 30000)}`;

  return prompt;
}

function buildWriterPrompt(extractedJson: ExtractedJson, docType: string): string {
  const isROA = docType === "ROA";
  const tense = isROA ? "PAST tense (was implemented, was arranged)" : "FUTURE tense (we recommend, will provide)";

  return `You write polished HTML sections for Smiths Insurance & KiwiSaver ${docType} documents.
TENSE: ${tense}. TONE: Professional NZ financial adviser. FORMAT: HTML fragments only (p, ul, li, strong, em).
NEVER invent numbers. Use only data below. Sections not included → { "included": false, "html": "" }.

DATA: ${JSON.stringify(extractedJson, null, 2)}

Return JSON with "sections": { key: { "included": bool, "html": "..." } } and "meta": { "document_title", "client_name" }.
Keys: special_instructions, reasons_life, reasons_trauma, reasons_progressive_care, reasons_tpd, reasons_income_mortgage, reasons_aic, pros_life, cons_life, pros_trauma, cons_trauma, pros_tpd, cons_tpd, pros_income_mp, cons_income_mp, pros_aic, cons_aic, modification_notes, summary, scope, out_of_scope, responsibilities.`;
}

export class OpenAIProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<ExtractedJson> {
    const prompt = buildExtractPrompt(input);
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Extract structured JSON from NZ insurance documents. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 6000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from extractor");

    const parsed = JSON.parse(content);
    const result = ExtractedJsonSchema.safeParse(parsed);
    if (result.success) return result.data;

    // Retry
    console.warn("Extractor validation failed, retrying...");
    const retry = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Extract structured JSON from insurance documents." },
        { role: "user", content: prompt },
        { role: "assistant", content: content },
        { role: "user", content: `Validation errors:\n${JSON.stringify(result.error.issues.slice(0, 5), null, 2)}\nFix and return corrected JSON.` },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 6000,
    });

    const retryContent = retry.choices[0]?.message?.content;
    if (retryContent) {
      const retryResult = ExtractedJsonSchema.safeParse(JSON.parse(retryContent));
      if (retryResult.success) return retryResult.data;
    }

    return ExtractedJsonSchema.parse({ client: {}, doc_type: input.docType, sections_included: {}, missing_fields: ["Extraction failed"] });
  }

  async writeSections(extractedJson: ExtractedJson, docType: string): Promise<WriterOutput> {
    const prompt = buildWriterPrompt(extractedJson, docType);
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Write professional NZ insurance advisory sections. Return valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from writer");

    const parsed = JSON.parse(content);
    const result = WriterOutputSchema.safeParse(parsed);
    if (result.success) return result.data;

    return { sections: {}, meta: { document_title: `${docType} Document` } };
  }
}
