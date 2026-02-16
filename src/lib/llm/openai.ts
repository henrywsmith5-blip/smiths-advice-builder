import OpenAI from "openai";
import type { LLMProvider, ExtractInput } from "./provider";
import { FactPackSchema, WriterOutputSchema } from "./schemas";
import type { FactPack, WriterOutput } from "./schemas";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

// Same system prompts as Anthropic for consistency
const EXTRACTOR_SYSTEM = `You are a structured data extractor for NZ insurance advisory documents for Craig Smith of Smiths Insurance & KiwiSaver. Extract factual client and policy data into a JSON Fact Pack.

RULES:
1. Extract ONLY what is explicitly stated. Never infer or fabricate.
2. Preserve exact dollar amounts. Premium amounts as raw numbers (68.49 not "$68.49") in premiumAmount fields.
3. NEVER compute totals, savings, increases, or any derived math.
4. NEVER decide partner/individual or existing cover structure — the app UI controls that.
5. If data is missing, use null and add to missingFields[].
6. For health disclosures, capture every condition mentioned.
7. If "no advice was given" on amount, set adviceTypeFlags.noAdviceOnAmount to true.
8. Always distinguish limited vs full advice.

Return ONLY valid JSON.`;

const WRITER_SYSTEM = `You write as Craig Smith of Smiths Insurance & KiwiSaver (NZ FAP Licence #712931).

VOICE: Mid-formal, professional but accessible. 70% analytical, 30% empathetic. Direct, factual, never hedging.
SENTENCES: Lead 10-18 words. Explanatory 15-30. Max 35 words. Paragraphs 2-4 sentences.
PRONOUNS: "I" for personal actions. "we" for firm scope. "you/your" for client. NEVER "the client/policyholder".
NZ ENGLISH: favour, analyse, organise. "$" with commas. Always state frequency.
RISK: Name specific conditions (cancer, heart attack, stroke). Tie to client's finances. "In the event of" framing. Never fear language.
PREMIUM: NEVER compute totals/savings/increases. State facts only.
FORBIDDEN: "industry-leading", "best-in-class", "devastating", "peace of mind", "we strongly urge", "it's important to note", "the best option", "please don't hesitate".
MISSING DATA: Insert [CLIENT-SPECIFIC DATA REQUIRED]. Never omit sections.

Return JSON with "sections" (key → {included, html}) and "meta". HTML fragments only.`;

function buildExtractPrompt(input: ExtractInput): string {
  let prompt = `Extract into JSON Fact Pack for ${input.docType}.\n`;
  if (input.clientOverrides?.name) {
    prompt += `\nClient A: ${input.clientOverrides.name}`;
    if (input.clientOverrides.nameB) prompt += `\nClient B: ${input.clientOverrides.nameB}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }
  if (input.firefliesText) prompt += `\n\n=== TRANSCRIPT ===\n${input.firefliesText.substring(0, 80000)}`;
  if (input.quotesText) prompt += `\n\n=== QUOTES (primary for numbers) ===\n${input.quotesText.substring(0, 80000)}`;
  if (input.otherDocsText) prompt += `\n\n=== OTHER DOCS ===\n${input.otherDocsText.substring(0, 40000)}`;
  if (input.additionalContext) prompt += `\n\n=== ADVISER NOTES (primary) ===\n${input.additionalContext.substring(0, 80000)}`;
  if (input.roaDeviations) prompt += `\n\n=== DEVIATIONS ===\n${input.roaDeviations.substring(0, 30000)}`;
  return prompt;
}

function buildWriterPrompt(factPack: FactPack, docType: string): string {
  const isROA = docType === "ROA";
  const tense = isROA ? "PAST tense" : "FUTURE tense";
  return `Generate narrative sections for a ${docType}. Use ${tense}.
Keys: special_instructions, reasons_life, reasons_trauma, reasons_progressive_care, reasons_tpd, reasons_income_mortgage, reasons_aic, pros_life, cons_life, pros_trauma, cons_trauma, pros_tpd, cons_tpd, pros_income_mp, cons_income_mp, pros_aic, cons_aic, modification_notes, summary.
Data:\n${JSON.stringify(factPack, null, 2)}\nReturn ONLY valid JSON.`;
}

export class OpenAIProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<FactPack> {
    const prompt = buildExtractPrompt(input);
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: EXTRACTOR_SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 8000,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    const result = FactPackSchema.safeParse(JSON.parse(content));
    if (result.success) return result.data;
    return FactPackSchema.parse({ clients: [], missingFields: ["Extraction failed"] });
  }

  async writeSections(factPack: FactPack, docType: string): Promise<WriterOutput> {
    const prompt = buildWriterPrompt(factPack, docType);
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: WRITER_SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.25,
      max_tokens: 8000,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    const result = WriterOutputSchema.safeParse(JSON.parse(content));
    if (result.success) return result.data;
    return { sections: {}, meta: { document_title: `${docType} Document` } };
  }
}
