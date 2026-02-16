import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ExtractInput } from "./provider";
import { FactPackSchema, WriterOutputSchema } from "./schemas";
import type { FactPack, WriterOutput } from "./schemas";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

function buildExtractPrompt(input: ExtractInput): string {
  const isROA = input.docType === "ROA";

  let prompt = `You are a data extraction specialist for Smiths Insurance & KiwiSaver (NZ).

TASK: Extract facts from insurance documents into a JSON "Fact Pack".
DOCUMENT TYPE: ${input.docType} (${isROA ? "Record of Advice — what was IMPLEMENTED" : "Statement of Advice — what is RECOMMENDED"})

ABSOLUTE RULES:
1. NEVER compute totals, savings, increases, or any derived math. The app computes these.
2. NEVER guess or invent numbers. If not explicitly stated, use null.
3. NEVER decide if this is Partner or Individual — the app UI controls that.
4. NEVER decide if there is existing cover — the app UI controls that.
5. Extract per-client premiums as raw numbers (e.g., 68.49 not "$68.49").
6. Monetary cover amounts keep "$" formatting (e.g., "$200,000").
7. If two clients exist in the data, create TWO client objects (id "A" and "B").
8. If data for a field is missing, use null and add the field name to missingFields[].

REQUIRED JSON STRUCTURE:
{
  "caseMeta": {
    "frequency": "fortnight" | "month" | "year"
  },
  "clients": [
    {
      "id": "A",
      "name": "Full Name or null",
      "dob": "date or null",
      "email": "email or null",
      "phone": "phone or null",
      "occupation": "occupation or null",
      "smoker": true/false/null,
      "income": "$132,000 or null",
      "existingCover": {
        "insurer": "Insurer Name or null",
        "covers": {
          "life": "$100,000 or null",
          "trauma": "$50,000 or null",
          "tpd": "null if none",
          "ip": "$4,000/month or null",
          "mp": "$2,500/month or null",
          "aic": "$100,000 or null",
          "premiumCover": "Included or null",
          "health": "Comprehensive or null"
        },
        "premium": { "amount": 37.96, "frequency": "fortnight" }
      },
      "implementedCover": {
        "insurer": "Insurer Name or null",
        "covers": { same keys },
        "premium": { "amount": 68.49, "frequency": "fortnight" }
      },
      "benefitsSummary": {
        "ip": { "monthlyAmount": "$5,500", "waitPeriod": "4 weeks", "benefitPeriod": "To age 65", "premium": "$85.00" } or null,
        "mp": { "monthlyAmount": "$3,200", "waitPeriod": "4 weeks", "benefitPeriod": "5 years", "premium": "$45.00" } or null
      }
    }
  ],
  "sectionsIncluded": {
    "life": true/false,
    "trauma": true/false,
    "tpd": true/false,
    "incomeProtection": true/false,
    "mortgageProtection": true/false,
    "accidentalInjury": true/false,
    "health": true/false
  },
  "shared": {
    "address": "address or null",
    "mortgage": "$610,000 or null",
    "children": "2 (Aged 4 and 2) or null",
    "objectives": ["objective 1", "objective 2"],
    "specialInstructions": "text or null",
    "situationSummary": "Brief summary of why client sought advice"
  },
  "missingFields": ["field names that could not be found"]
}

CRITICAL REMINDERS:
- Premium amounts MUST be raw numbers (68.49) not strings ("$68.49")
- Do NOT include "savings" or "total" or "increase" fields — the app computes these
- If only one client exists, still put them in the clients array as id "A"
- For Partner cases, Client B must exist even if some fields are null

Return ONLY valid JSON.`;

  if (input.clientOverrides?.name) {
    prompt += `\n\n=== CLIENT DETAILS (from adviser) ===\nClient A: ${input.clientOverrides.name}`;
    if (input.clientOverrides.nameB) prompt += `\nClient B: ${input.clientOverrides.nameB}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }
  if (input.firefliesText) prompt += `\n\n=== MEETING TRANSCRIPT ===\n${input.firefliesText.substring(0, 60000)}`;
  if (input.quotesText) prompt += `\n\n=== INSURANCE QUOTES/SCHEDULES (PRIMARY source for numbers) ===\n${input.quotesText.substring(0, 60000)}`;
  if (input.otherDocsText) prompt += `\n\n=== OTHER DOCUMENTS ===\n${input.otherDocsText.substring(0, 30000)}`;
  if (input.additionalContext) prompt += `\n\n=== ADVISER NOTES / ALL CONTEXT (PRIMARY source) ===\n${input.additionalContext.substring(0, 60000)}`;
  if (input.roaDeviations) prompt += `\n\n=== DEVIATIONS ===\n${input.roaDeviations.substring(0, 30000)}`;

  return prompt;
}

function buildWriterPrompt(factPack: FactPack, docType: string): string {
  const isROA = docType === "ROA";
  const tense = isROA ? "PAST tense (was implemented, was arranged)" : "FUTURE tense (we recommend, will provide)";

  return `You are a document writer for Smiths Insurance & KiwiSaver (NZ).

TASK: Write polished HTML content sections for a ${docType}.

TENSE: ${tense}
TONE: Professional NZ financial adviser. Concise, authoritative.
FORMAT: HTML fragments ONLY — <p>, <ul>, <li>, <strong>, <em>. No full document tags.

ABSOLUTE RULES:
1. NEVER compute or state premium totals, savings, or increase amounts. The app injects these.
2. NEVER write "savings of $X" or "increase of $X" — use generic phrasing or skip premium discussion.
3. If a section's cover type is not included, return { "included": false, "html": "" }.
4. For pros/cons, write 3-5 bullet points each as <ul><li> lists.
5. For reasons, explain WHY based on client situation (2-3 sentences).
6. Use ONLY facts from the data below. Never invent numbers.

FACT PACK DATA:
${JSON.stringify(factPack, null, 2)}

Return JSON with "sections" and "meta":
{
  "sections": {
    "key": { "included": true/false, "html": "<p>...</p>" }
  },
  "meta": { "document_title": "...", "client_name": "..." }
}

SECTION KEYS TO RETURN:
- special_instructions, reasons_life, reasons_trauma, reasons_progressive_care
- reasons_tpd, reasons_income_mortgage, reasons_aic
- pros_life, cons_life, pros_trauma, cons_trauma
- pros_tpd, cons_tpd, pros_income_mp, cons_income_mp
- pros_aic, cons_aic
- modification_notes, summary

Return ONLY valid JSON.`;
}

export class AnthropicProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<FactPack> {
    const prompt = buildExtractPrompt(input);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in extractor response");

    const parsed = JSON.parse(jsonMatch[0]);
    const result = FactPackSchema.safeParse(parsed);

    if (result.success) return result.data;

    console.warn("Extractor validation failed, retrying...", result.error.issues.slice(0, 3));
    const retryResponse = await client.messages.create({
      model: MODEL, max_tokens: 6000, temperature: 0,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: text },
        { role: "user", content: `Validation errors:\n${JSON.stringify(result.error.issues.slice(0, 5), null, 2)}\nFix and return corrected JSON.` },
      ],
    });

    const retryText = retryResponse.content[0]?.type === "text" ? retryResponse.content[0].text : "";
    const retryMatch = retryText.match(/\{[\s\S]*\}/);
    if (retryMatch) {
      const retryResult = FactPackSchema.safeParse(JSON.parse(retryMatch[0]));
      if (retryResult.success) return retryResult.data;
    }

    return FactPackSchema.parse({ clients: [], missingFields: ["Full extraction failed — review manually"] });
  }

  async writeSections(factPack: FactPack, docType: string): Promise<WriterOutput> {
    const prompt = buildWriterPrompt(factPack, docType);

    const response = await client.messages.create({
      model: MODEL, max_tokens: 8000, temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in writer response");

    const parsed = JSON.parse(jsonMatch[0]);
    const result = WriterOutputSchema.safeParse(parsed);
    if (result.success) return result.data;

    return { sections: {}, meta: { document_title: `${docType} Document` } };
  }
}
