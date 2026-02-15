import OpenAI from "openai";
import type { LLMProvider, ExtractInput } from "./provider";
import { ExtractedJsonSchema, WriterOutputSchema } from "./schemas";
import type { ExtractedJson, WriterOutput } from "./schemas";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

function buildExtractPrompt(input: ExtractInput): string {
  const parts: string[] = [];

  parts.push(`You are an expert NZ insurance/KiwiSaver data extractor. Extract structured data from the provided documents.
Document type requested: ${input.docType}

RULES:
- Never fabricate numbers, providers, or cover amounts. If data is missing, mark as "unknown".
- Extract exactly what is stated in the source documents.
- Include evidence_quotes that are SHORT direct citations from the source text.
- List all unknowns explicitly.

Return valid JSON matching the schema provided.`);

  if (input.clientOverrides?.name) {
    parts.push(`\n--- CLIENT OVERRIDES ---\nName: ${input.clientOverrides.name}`);
    if (input.clientOverrides.nameB) parts.push(`Partner Name: ${input.clientOverrides.nameB}`);
    if (input.clientOverrides.email) parts.push(`Email: ${input.clientOverrides.email}`);
  }

  if (input.firefliesText) {
    parts.push(`\n--- FIREFLIES TRANSCRIPT ---\n${input.firefliesText.substring(0, 50000)}`);
  }

  if (input.quotesText) {
    parts.push(`\n--- QUOTE DOCUMENTS ---\n${input.quotesText.substring(0, 50000)}`);
  }

  if (input.otherDocsText) {
    parts.push(`\n--- OTHER DOCUMENTS ---\n${input.otherDocsText.substring(0, 30000)}`);
  }

  if (input.additionalContext) {
    parts.push(`\n--- ADDITIONAL CONTEXT ---\n${input.additionalContext.substring(0, 10000)}`);
  }

  if (input.roaDeviations) {
    parts.push(`\n--- ROA DEVIATIONS / DIFFERENCES VS SOA ---\n${input.roaDeviations.substring(0, 10000)}`);
  }

  return parts.join("\n");
}

function buildWriterPrompt(extractedJson: ExtractedJson, docType: string): string {
  return `You are a professional NZ financial adviser document writer for Smiths Insurance & KiwiSaver.

DOCUMENT TYPE: ${docType}

HOUSE STYLE:
- Professional NZ financial adviser tone
- ${docType === "SOA" ? "Future tense (will recommend, will provide)" : "Past tense (implemented, placed, arranged)"}
- If a section is not included, return empty html string
- NEVER invent numbers, providers, or cover amounts not in the data
- Keep it concise; use bullet lists where appropriate
- Return valid HTML fragments only (no full document, no <html>, no <body>)

EXTRACTED DATA:
${JSON.stringify(extractedJson, null, 2)}

Return JSON with "sections" object where each key maps to { "included": boolean, "html": "<p>...</p>" }.
Also return "meta" with document_title and client_name.

Section keys to include: life, trauma, tpd, income_protection, mortgage, health, special_instructions, reasons_life, reasons_trauma, reasons_tpd, reasons_income_mortgage, pros_life, cons_life, pros_trauma, cons_trauma, pros_tpd, cons_tpd, pros_income_mp, cons_income_mp, summary, scope, out_of_scope, responsibilities, deviations`;
}

export class OpenAIProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<ExtractedJson> {
    const prompt = buildExtractPrompt(input);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You extract structured JSON from insurance documents. Always return valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI extractor");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("OpenAI returned invalid JSON for extraction");
    }

    // Validate with Zod
    const result = ExtractedJsonSchema.safeParse(parsed);
    if (result.success) return result.data;

    // Retry once with error feedback
    console.warn("Extractor validation failed, retrying with feedback...");
    const retryResponse = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You extract structured JSON from insurance documents." },
        { role: "user", content: prompt },
        { role: "assistant", content: content },
        {
          role: "user",
          content: `The JSON you returned had validation errors:\n${JSON.stringify(result.error.issues, null, 2)}\n\nPlease fix and return corrected JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 8000,
    });

    const retryContent = retryResponse.choices[0]?.message?.content;
    if (!retryContent) throw new Error("No response from OpenAI retry");

    const retryParsed = JSON.parse(retryContent);
    const retryResult = ExtractedJsonSchema.safeParse(retryParsed);
    if (retryResult.success) return retryResult.data;

    // Return best-effort parse
    console.error("Retry validation also failed, using partial data");
    return ExtractedJsonSchema.parse({
      client: {},
      doc_type: input.docType,
      sections: {},
      unknowns: ["Extraction validation failed - review manually"],
    });
  }

  async writeSections(extractedJson: ExtractedJson, docType: string): Promise<WriterOutput> {
    const prompt = buildWriterPrompt(extractedJson, docType);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You write professional NZ insurance advisory document sections. Return valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI writer");

    const parsed = JSON.parse(content);
    const result = WriterOutputSchema.safeParse(parsed);

    if (result.success) return result.data;

    // Best effort
    console.warn("Writer output validation issues:", result.error.issues);
    return {
      sections: {},
      meta: { document_title: `${docType} Document`, client_name: extractedJson.client.name },
    };
  }
}
