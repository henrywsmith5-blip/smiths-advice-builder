import OpenAI from "openai";
import type { LLMProvider, ExtractInput } from "./provider";
import { FactPackSchema, WriterOutputSchema } from "./schemas";
import type { FactPack, WriterOutput } from "./schemas";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

function buildExtractPrompt(input: ExtractInput): string {
  const isROA = input.docType === "ROA";
  let prompt = `You are a data extraction specialist for Smiths Insurance & KiwiSaver (NZ).
TASK: Extract facts into a JSON Fact Pack. Document type: ${input.docType} (${isROA ? "Record of Advice" : "Statement of Advice"})
RULES: Never compute totals/savings/increases. Never decide partner/existing structure. Premium amounts as raw numbers. Missing values = null + add to missingFields[].
Return JSON with: caseMeta, clients[], sectionsIncluded, shared, missingFields. Each client has existingCover, implementedCover, benefitsSummary.`;

  if (input.clientOverrides?.name) {
    prompt += `\n\n=== CLIENT ===\nA: ${input.clientOverrides.name}`;
    if (input.clientOverrides.nameB) prompt += `\nB: ${input.clientOverrides.nameB}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }
  if (input.firefliesText) prompt += `\n\n=== TRANSCRIPT ===\n${input.firefliesText.substring(0, 60000)}`;
  if (input.quotesText) prompt += `\n\n=== QUOTES (primary) ===\n${input.quotesText.substring(0, 60000)}`;
  if (input.otherDocsText) prompt += `\n\n=== OTHER DOCS ===\n${input.otherDocsText.substring(0, 30000)}`;
  if (input.additionalContext) prompt += `\n\n=== ADVISER NOTES (primary) ===\n${input.additionalContext.substring(0, 60000)}`;
  if (input.roaDeviations) prompt += `\n\n=== DEVIATIONS ===\n${input.roaDeviations.substring(0, 30000)}`;
  return prompt;
}

function buildWriterPrompt(factPack: FactPack, docType: string): string {
  const isROA = docType === "ROA";
  return `Write HTML sections for a Smiths ${docType}. Tense: ${isROA ? "PAST" : "FUTURE"}. NEVER compute premium totals/savings. Use only facts from data. Return JSON with "sections" and "meta".
Keys: special_instructions, reasons_life, reasons_trauma, reasons_progressive_care, reasons_tpd, reasons_income_mortgage, reasons_aic, pros_life, cons_life, pros_trauma, cons_trauma, pros_tpd, cons_tpd, pros_income_mp, cons_income_mp, pros_aic, cons_aic, modification_notes, summary.
Data: ${JSON.stringify(factPack, null, 2)}`;
}

export class OpenAIProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<FactPack> {
    const prompt = buildExtractPrompt(input);
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Extract facts into JSON. Never compute totals or savings." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 6000,
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
        { role: "system", content: "Write NZ insurance advisory sections. Never compute premiums." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8000,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    const result = WriterOutputSchema.safeParse(JSON.parse(content));
    if (result.success) return result.data;
    return { sections: {}, meta: { document_title: `${docType} Document` } };
  }
}
