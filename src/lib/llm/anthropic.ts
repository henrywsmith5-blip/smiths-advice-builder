import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ExtractInput } from "./provider";
import { ExtractedJsonSchema, WriterOutputSchema } from "./schemas";
import type { ExtractedJson, WriterOutput } from "./schemas";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

function buildExtractPrompt(input: ExtractInput): string {
  const isROA = input.docType === "ROA";

  let prompt = `You are a data extraction specialist for Smiths Insurance & KiwiSaver, a New Zealand financial advice provider.

TASK: Extract structured data from the provided insurance documents into a precise JSON format.
DOCUMENT TYPE: ${input.docType} (${isROA ? "Record of Advice — what was IMPLEMENTED" : "Statement of Advice — what is being RECOMMENDED"})

CRITICAL RULES:
1. NEVER invent or guess numbers. If a sum insured, premium, or amount is not explicitly stated, use null.
2. All monetary values should include "$" and be formatted as they appear (e.g. "$500,000", "$145.20").
3. If a value cannot be found, use null and ADD it to the "missing_fields" array.
4. Prefer insurer formal quotes / schedules for cover amounts and premiums over transcript discussion.
5. If there are two clients (partner case), extract data separately for client_a and client_b.

REQUIRED JSON STRUCTURE:
{
  "client": {
    "name_a": "First client full name or null",
    "name_b": "Second client full name or null (partner cases only)",
    "email": "Client email or null",
    "phone": "Client phone or null"
  },
  "doc_type": "${input.docType}",
  "sections_included": {
    "life": true/false,
    "trauma": true/false,
    "tpd": true/false,
    "income_protection": true/false,
    "mortgage_protection": true/false,
    "accidental_injury": true/false,
    "health": true/false
  },
  "client_a_existing_insurer": "Insurer name or null",
  "client_a_new_insurer": "Insurer name or null",
  "client_a_old_cover": {
    "life": "$500,000 or null",
    "trauma": "$100,000 or null",
    "tpd": "$50,000 or null",
    "income_protection": "$4,000/month or null",
    "mortgage_protection": "$2,500/month or null",
    "accidental_injury": "$100,000 or null",
    "premium_cover": "Included or null",
    "health": "Comprehensive or null"
  },
  "client_a_new_cover": {
    "life": "$600,000 or null",
    "trauma": "$150,000 or null",
    ... same fields
  },
  "client_b_existing_insurer": "or null if single client",
  "client_b_new_insurer": "or null if single client",
  "client_b_old_cover": { ...same fields, all null if single },
  "client_b_new_cover": { ...same fields, all null if single },
  "premium": {
    "existing_total": "$180.50 or null",
    "new_total": "$145.20 or null",
    "frequency": "per month",
    "savings": "$35.30 or null",
    "annual_savings": "$423.60 or null"
  },
  "benefits": {
    "mortgage_protection": {
      "monthly_amount": "$2,500 or null",
      "wait_period": "4 weeks or null",
      "benefit_period": "2 years or null",
      "premium": "$45.00 or null"
    },
    "income_protection": {
      "monthly_amount": "$4,000 or null",
      "wait_period": "4 weeks or null",
      "benefit_period": "To age 65 or null",
      "premium": "$85.00 or null"
    }
  },
  "situation_summary": "Brief summary of why the client is seeking advice (from transcript/notes)",
  "special_instructions": "Any special requests or objectives mentioned",
  "missing_fields": ["List of fields that could not be found in the documents"]
}

Return ONLY valid JSON. No markdown, no explanation, just the JSON object.`;

  // Append source documents
  if (input.clientOverrides?.name) {
    prompt += `\n\n=== CLIENT DETAILS (provided by adviser) ===\nClient A Name: ${input.clientOverrides.name}`;
    if (input.clientOverrides.nameB) prompt += `\nClient B Name: ${input.clientOverrides.nameB}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }

  if (input.firefliesText) {
    prompt += `\n\n=== MEETING TRANSCRIPT (Fireflies) ===\n${input.firefliesText.substring(0, 60000)}`;
  }

  if (input.quotesText) {
    prompt += `\n\n=== INSURANCE QUOTES / SCHEDULES ===\nThese are the PRIMARY source for cover amounts and premiums. Trust these numbers.\n${input.quotesText.substring(0, 60000)}`;
  }

  if (input.otherDocsText) {
    prompt += `\n\n=== OTHER DOCUMENTS ===\n${input.otherDocsText.substring(0, 30000)}`;
  }

  if (input.additionalContext) {
    prompt += `\n\n=== ADVISER NOTES ===\n${input.additionalContext.substring(0, 10000)}`;
  }

  if (input.roaDeviations) {
    prompt += `\n\n=== DEVIATIONS FROM ORIGINAL RECOMMENDATION ===\n${input.roaDeviations.substring(0, 10000)}`;
  }

  return prompt;
}

function buildWriterPrompt(extractedJson: ExtractedJson, docType: string): string {
  const isROA = docType === "ROA";
  const tense = isROA ? "PAST tense (was implemented, was arranged, was placed)" : "FUTURE tense (we recommend, will provide, is proposed)";

  return `You are a professional document writer for Smiths Insurance & KiwiSaver, a New Zealand financial advice provider.

TASK: Write polished HTML content sections for a ${docType} (${isROA ? "Record of Advice" : "Statement of Advice"}).

TENSE: ALL narrative must be in ${tense}.
TONE: Professional NZ financial adviser. Concise, clear, authoritative. No fluff.
FORMAT: Return HTML fragments ONLY — use <p>, <ul>, <li>, <strong>, <em>. No <html>, <body>, <head>.

CRITICAL RULES:
1. NEVER invent any numbers, providers, or cover amounts. Use ONLY what is in the extracted data below.
2. If a section is not included (sections_included = false), return { "included": false, "html": "" }
3. Keep paragraphs short (2-3 sentences). Use bullet lists for comparisons.
4. For pros/cons sections, write 3-5 bullet points each.
5. For reasons sections, explain WHY this cover type was ${isROA ? "implemented" : "recommended"} based on the client's situation.

EXTRACTED DATA:
${JSON.stringify(extractedJson, null, 2)}

REQUIRED OUTPUT — JSON with "sections" object. Each key maps to { "included": boolean, "html": "..." }.

SECTION KEYS YOU MUST RETURN:
- "special_instructions": Client's objectives / special requests narrative
- "reasons_life": Why life cover was ${isROA ? "implemented" : "recommended"}
- "reasons_trauma": Why trauma cover was ${isROA ? "implemented" : "recommended"}
- "reasons_progressive_care": Why progressive care was ${isROA ? "chosen" : "recommended"}
- "reasons_tpd": Why TPD cover was ${isROA ? "implemented" : "recommended"}
- "reasons_income_mortgage": Why income/mortgage protection was ${isROA ? "implemented" : "recommended"}
- "reasons_aic": Why accidental injury cover was ${isROA ? "included" : "recommended"}
- "pros_life": Pros of ${isROA ? "the implemented" : "the recommended"} life cover (HTML bullet list)
- "cons_life": Cons / trade-offs of life cover change (HTML bullet list)
- "pros_trauma": Pros of trauma cover (HTML bullet list)
- "cons_trauma": Cons of trauma cover (HTML bullet list)
- "pros_tpd": Pros of TPD cover (HTML bullet list)
- "cons_tpd": Cons of TPD cover (HTML bullet list)
- "pros_income_mp": Pros of income/mortgage protection (HTML bullet list)
- "cons_income_mp": Cons of income/mortgage protection (HTML bullet list)
- "pros_aic": Pros of accidental injury cover (HTML bullet list)
- "cons_aic": Cons of accidental injury cover (HTML bullet list)
- "modification_notes": Any deviations or modifications (if applicable)
- "summary": Overall summary of what was ${isROA ? "implemented" : "recommended"}
- "scope": Scope of services provided
- "out_of_scope": What is out of scope
- "responsibilities": Client responsibilities

Also return "meta" with "document_title" and "client_name".

Return ONLY valid JSON. No markdown wrapper.`;
}

export class AnthropicProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<ExtractedJson> {
    const prompt = buildExtractPrompt(input);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in extractor response");

    const parsed = JSON.parse(jsonMatch[0]);
    const result = ExtractedJsonSchema.safeParse(parsed);

    if (result.success) return result.data;

    // Retry once with error feedback
    console.warn("Extractor validation failed, retrying...", result.error.issues.slice(0, 3));
    const retryResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: text },
        {
          role: "user",
          content: `Your JSON had validation errors:\n${JSON.stringify(result.error.issues.slice(0, 5), null, 2)}\n\nFix these and return corrected JSON only.`,
        },
      ],
    });

    const retryText = retryResponse.content[0]?.type === "text" ? retryResponse.content[0].text : "";
    const retryMatch = retryText.match(/\{[\s\S]*\}/);
    if (retryMatch) {
      const retryParsed = JSON.parse(retryMatch[0]);
      const retryResult = ExtractedJsonSchema.safeParse(retryParsed);
      if (retryResult.success) return retryResult.data;
    }

    // Best effort fallback
    console.error("Extraction failed after retry");
    return ExtractedJsonSchema.parse({
      client: {},
      doc_type: input.docType,
      sections_included: {},
      missing_fields: ["Extraction validation failed — review all fields manually"],
    });
  }

  async writeSections(extractedJson: ExtractedJson, docType: string): Promise<WriterOutput> {
    const prompt = buildWriterPrompt(extractedJson, docType);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in writer response");

    const parsed = JSON.parse(jsonMatch[0]);
    const result = WriterOutputSchema.safeParse(parsed);

    if (result.success) return result.data;

    console.warn("Writer validation issues:", result.error.issues.slice(0, 3));
    return { sections: {}, meta: { document_title: `${docType} Document` } };
  }
}
