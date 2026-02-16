import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ExtractInput } from "./provider";
import { FactPackSchema, WriterOutputSchema } from "./schemas";
import type { FactPack, WriterOutput } from "./schemas";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5-20250929";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Forgiving parser — accepts any reasonable JSON structure and maps
 * it into the FactPack format. Handles old schema, new schema, and
 * completely freeform LLM output.
 */
function forgivingParse(raw: Record<string, any>): FactPack {
  const fp: any = {
    documentMetadata: raw.documentMetadata || raw.document_metadata || {},
    clients: [],
    scopeOfAdvice: { isLimitedAdvice: false, perClient: [] },
    specialInstructions: null,
    existingCover: [],
    recommendedCover: [],
    premiumComparison: {},
    insurerSelectionReasoning: [],
    replacementConsiderations: { isReplacement: false },
    adviceTypeFlags: {},
    productDetailsToInclude: [],
    benefitsSummaryA: { ip: null, mp: null },
    benefitsSummaryB: { ip: null, mp: null },
    missingFields: raw.missingFields || raw.missing_fields || [],
  };

  // Map clients from various formats
  const rawClients = raw.clients || raw.client || [];
  if (Array.isArray(rawClients)) {
    fp.clients = rawClients.map((c: any, i: number) => ({
      clientLabel: c.clientLabel || c.client_label || (i === 0 ? "Client A" : "Client B"),
      fullName: c.fullName || c.full_name || c.name || c.name_a || c.name_b || null,
      email: c.email || null,
      phone: c.phone || null,
      occupation: c.occupation || null,
      smokerStatus: c.smokerStatus || c.smoker_status || null,
      income: c.income || c.incomeGrossAnnual || null,
      dateOfBirth: c.dateOfBirth || c.date_of_birth || c.dob || null,
      healthDisclosures: c.healthDisclosures || c.health_disclosures || [],
      lifestyleDisclosures: c.lifestyleDisclosures || c.lifestyle_disclosures || {},
    }));
  } else if (typeof rawClients === "object" && rawClients.name_a) {
    // Old flat client format
    fp.clients = [
      { clientLabel: "Client A", fullName: rawClients.name_a, email: rawClients.email, phone: rawClients.phone },
    ];
    if (rawClients.name_b) {
      fp.clients.push({ clientLabel: "Client B", fullName: rawClients.name_b });
    }
  }

  // Map existing cover
  const rawExisting = raw.existingCover || raw.existing_cover || [];
  if (Array.isArray(rawExisting)) {
    fp.existingCover = rawExisting.map((e: any) => ({
      clientName: e.clientName || e.client_name || "",
      insurer: e.insurer || null,
      covers: Array.isArray(e.covers) ? e.covers.map((c: any) => ({
        coverType: c.coverType || c.cover_type || "",
        sumInsured: c.sumInsured || c.sum_insured || null,
        benefitPeriod: c.benefitPeriod || c.benefit_period || null,
        waitPeriod: c.waitPeriod || c.wait_period || null,
      })) : [],
      totalPremium: e.totalPremium || e.total_premium || null,
      premiumAmount: typeof e.premiumAmount === "number" ? e.premiumAmount : (typeof e.premium_amount === "number" ? e.premium_amount : null),
      premiumFrequency: e.premiumFrequency || e.premium_frequency || null,
    }));
  }

  // Map recommended cover
  const rawRec = raw.recommendedCover || raw.recommended_cover || [];
  if (Array.isArray(rawRec)) {
    fp.recommendedCover = rawRec.map((r: any) => ({
      clientName: r.clientName || r.client_name || "",
      insurer: r.insurer || null,
      covers: Array.isArray(r.covers) ? r.covers.map((c: any) => ({
        coverType: c.coverType || c.cover_type || "",
        sumInsured: c.sumInsured || c.sum_insured || null,
        benefitPeriod: c.benefitPeriod || c.benefit_period || null,
        waitPeriod: c.waitPeriod || c.wait_period || null,
      })) : [],
      totalPremium: r.totalPremium || r.total_premium || null,
      premiumAmount: typeof r.premiumAmount === "number" ? r.premiumAmount : (typeof r.premium_amount === "number" ? r.premium_amount : null),
      premiumFrequency: r.premiumFrequency || r.premium_frequency || null,
    }));
  }

  // Map special instructions
  fp.specialInstructions = raw.specialInstructions || raw.special_instructions || raw.shared?.specialInstructions || raw.shared?.special_instructions || null;

  // Map scope
  const rawScope = raw.scopeOfAdvice || raw.scope_of_advice || raw.scope;
  if (rawScope) {
    fp.scopeOfAdvice.isLimitedAdvice = rawScope.isLimitedAdvice || rawScope.is_limited_advice || false;
    if (Array.isArray(rawScope.perClient || rawScope.per_client)) {
      fp.scopeOfAdvice.perClient = (rawScope.perClient || rawScope.per_client).map((s: any) => ({
        clientName: s.clientName || s.client_name || "",
        lifeInsurance: s.lifeInsurance || s.life_insurance || false,
        traumaInsurance: s.traumaInsurance || s.trauma_insurance || false,
        tpdInsurance: s.tpdInsurance || s.tpd_insurance || false,
        incomeProtection: s.incomeProtection || s.income_protection || false,
        redundancyCover: s.redundancyCover || s.redundancy_cover || false,
        healthInsurance: s.healthInsurance || s.health_insurance || false,
      }));
    }
  }

  // Map benefits
  const rawBenA = raw.benefitsSummaryA || raw.benefits_summary_a || raw.benefits?.a;
  const rawBenB = raw.benefitsSummaryB || raw.benefits_summary_b || raw.benefits?.b;
  if (rawBenA) fp.benefitsSummaryA = rawBenA;
  if (rawBenB) fp.benefitsSummaryB = rawBenB;

  // Map insurer reasoning
  fp.insurerSelectionReasoning = raw.insurerSelectionReasoning || raw.insurer_selection_reasoning || [];

  // Map replacement
  const rawRepl = raw.replacementConsiderations || raw.replacement_considerations;
  if (rawRepl) fp.replacementConsiderations = rawRepl;

  // Map advice flags
  const rawFlags = raw.adviceTypeFlags || raw.advice_type_flags;
  if (rawFlags) fp.adviceTypeFlags = rawFlags;

  console.log(`[Forgiving Parse] Mapped: ${fp.clients.length} clients, ${fp.existingCover.length} existing, ${fp.recommendedCover.length} recommended`);

  // Validate through Zod with lenient defaults
  return FactPackSchema.parse(fp);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ══════════════════════════════════════════════════════════════
// EXTRACTOR SYSTEM PROMPT — Part 3: Craig Smith corpus
// ══════════════════════════════════════════════════════════════
const EXTRACTOR_SYSTEM = `You are a structured data extractor for New Zealand insurance advisory documents. Your role is to extract factual client and policy data from meeting notes, transcripts, fact-finds, and adviser notes produced by or for Craig Smith of Smiths Insurance & KiwiSaver.

EXTRACTION PRIORITIES (in order):
1. Client identification data
2. Scope of advice requested
3. Existing cover details
4. Recommended/new cover details
5. Premium information (raw per-client amounts ONLY — never compute totals or savings)
6. Health and lifestyle disclosures
7. Employment and financial position
8. Insurer selection reasoning
9. Client-specific objectives and constraints
10. Compliance-relevant facts

EXTRACTION RULES:
1. Extract ONLY what is explicitly stated in the source material
2. Do NOT infer ages from dates unless both DOB and document date are provided
3. Preserve exact dollar amounts as written (do not round)
4. Preserve exact premium frequencies as stated
5. If a cover type is mentioned but no sum insured is given, set sumInsured to null and add to missingFields
6. For health disclosures, capture every condition mentioned, even if minor
7. For scope, only mark true if the document clearly indicates the box is ticked or the cover type is discussed
8. If the document says "no advice was given" on amount, set adviceTypeFlags.noAdviceOnAmount to true
9. Capture the client's own words for objectives where quoted
10. Always distinguish between "limited advice" and full advice engagements
11. Premium amounts: extract as RAW NUMBERS (e.g., 68.49 not "$68.49") in premiumAmount fields. The app computes all totals, savings, and increases.
12. NEVER compute combined premiums, savings, increases, or any derived math.
13. NEVER decide if this is Partner or Individual — the app UI controls that.
14. If two clients exist in the data, create two client objects in the clients array.

Return ONLY valid JSON matching the schema. No markdown, no explanation.`;

// ══════════════════════════════════════════════════════════════
// WRITER SYSTEM PROMPT — Part 4: Craig Smith voice fingerprint
// ══════════════════════════════════════════════════════════════
const WRITER_SYSTEM = `You are a regulated financial advice document writer producing Records of Advice (ROA) and Statements of Advice (SOA) for Craig Smith of Smiths Insurance & KiwiSaver, a New Zealand Financial Advice Provider (FAP Licence #712931).

YOU WRITE AS CRAIG SMITH. Your voice is his voice. You are not an AI generating a document — you are producing content that reads exactly as if Craig wrote it himself.

CORE VOICE:
- Mid-formal: professional but accessible. No legalese, no academic language.
- 70% analytical, 30% empathetic.
- Direct and factual — never hedging or vague.
- Warm through practical care, not emotional language.
- Never salesy, never corporate, never academic.

SENTENCE CONSTRUCTION:
- Lead sentences: 10-18 words, declarative, active voice
- Explanatory sentences: 15-30 words
- Closing sentences: 10-15 words, conclusive
- Hard maximum: 35 words per sentence
- Paragraphs: 2-4 sentences maximum
- Use contractions naturally but sparingly (don't, won't, you've)

PRONOUN RULES:
- "I" for personal recommendations and meeting actions ("I proposed", "I want to ensure")
- "we" for firm scope, provider panel, limitations ("we work with", "we will only consider")
- "you" / "your" for addressing the client ("your key priority", "you asked me to")
- NEVER "the client", "the policyholder", "the insured" in client-facing narrative

NZ ENGLISH:
- Use NZ/UK spelling: favour, analyse, organise, colour, licence (noun)
- Currency: "$" with commas ($100,000). Always state frequency: "per month", "per fortnight"
- Dates: DD/MM/YYYY or written as "Friday 23rd of January 2026"

RISK FRAMING:
- Name specific conditions: "cancer, heart attack, stroke" — never just "serious illness"
- Tie risk to client's actual financial exposure (mortgage, debts, income)
- Use "in the event of" framing
- Always pair risk with the solution in the same paragraph
- Reference ACC gap when relevant
- NEVER use fear language

PREMIUM EXPLANATIONS:
- NEVER compute totals, savings, or increases. The app provides these via placeholders.
- When discussing premiums, state facts only: "the premium for this cover is..." 
- Do NOT describe premium change direction unless the data explicitly states it.

INSURER EXPLANATIONS:
- Never criticise the old insurer
- Frame new option as "better suited" or "more appropriate" — never that the old one was bad
- Give concrete reasons: pricing, features, suitability

JUSTIFICATION PATTERN:
- Always use numbered reasons format
- Start with most tangible benefit (cost or coverage level)
- Work toward alignment/suitability

COVER PRODUCT DESCRIPTIONS (for Reasons sections):
1. What the cover provides (1-2 sentences)
2. Key features (bulleted list)
3. Built-in benefits at no extra cost (if applicable)
4. Why this cover matters for this client (1-2 sentences tying back to their situation)

FORBIDDEN CONTENT:
- "industry-leading", "best-in-class", "cutting-edge", "world-class"
- "devastating loss", "catastrophic event", "unthinkable happens"
- "we are pleased to present", "it is our pleasure"
- "we strongly urge", "it is imperative", "you must", "failure to act"
- "it's important to note", "it's worth noting", "as previously mentioned"
- "the best option", "the perfect cover", "the ideal solution"
- "please don't hesitate to contact us"
- "comprehensive" as standalone adjective for recommendation
- "peace of mind" (unless quoting the client)
- Never make guarantees about claim outcomes

MISSING DATA:
- Insert [CLIENT-SPECIFIC DATA REQUIRED] where data is missing
- Do NOT reflow or redesign around missing data
- Do NOT invent placeholder data
- Do NOT omit sections — include them with the placeholder

OUTPUT FORMAT:
Return JSON with "sections" and "meta". Each section key maps to { "included": boolean, "html": "..." }.
HTML fragments only — <p>, <ul>, <li>, <strong>, <em>. No full document tags.
If a section's cover type is not included, return { "included": false, "html": "" }.`;

function buildExtractPrompt(input: ExtractInput): string {
  let prompt = `Extract the following documents into a structured JSON Fact Pack for a ${input.docType} document.\n`;

  if (input.clientOverrides?.name) {
    prompt += `\n=== CLIENT DETAILS (from adviser) ===\nClient A: ${input.clientOverrides.name}`;
    if (input.clientOverrides.nameB) prompt += `\nClient B: ${input.clientOverrides.nameB}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }
  if (input.firefliesText) prompt += `\n\n=== MEETING TRANSCRIPT ===\n${input.firefliesText.substring(0, 80000)}`;
  if (input.quotesText) prompt += `\n\n=== INSURANCE QUOTES / SCHEDULES (PRIMARY source for cover amounts and premiums) ===\n${input.quotesText.substring(0, 80000)}`;
  if (input.otherDocsText) prompt += `\n\n=== OTHER DOCUMENTS ===\n${input.otherDocsText.substring(0, 40000)}`;
  if (input.additionalContext) prompt += `\n\n=== ADVISER NOTES / FULL CONTEXT (PRIMARY source — may contain all data) ===\n${input.additionalContext.substring(0, 80000)}`;
  if (input.roaDeviations) prompt += `\n\n=== DEVIATIONS FROM ORIGINAL RECOMMENDATION ===\n${input.roaDeviations.substring(0, 30000)}`;

  return prompt;
}

function buildWriterPrompt(factPack: FactPack, docType: string): string {
  const isROA = docType === "ROA";
  const tenseInstruction = isROA
    ? "ALL narrative must be in PAST tense (was implemented, was arranged, was placed, was selected)."
    : "ALL narrative must be in FUTURE tense (we recommend, will provide, is proposed, will be arranged).";

  return `Generate the narrative content sections for a ${docType} (${isROA ? "Record of Advice" : "Statement of Advice"}) document.

${tenseInstruction}

SECTION KEYS TO RETURN:
- "special_instructions": Client objectives / special requests / meeting summary narrative. Follow Craig's pattern: purpose of meeting → current situation → what they want → recommendation → reasoning tied to circumstances.
- "reasons_life": Why life cover was ${isROA ? "implemented" : "recommended"}. Include: what the cover provides, key features, why it matters for this client.
- "reasons_trauma": Why trauma cover was ${isROA ? "implemented" : "recommended"}.
- "reasons_progressive_care": Why progressive care / severity-based trauma was ${isROA ? "chosen" : "recommended"}.
- "reasons_tpd": Why TPD cover was ${isROA ? "implemented" : "recommended"}.
- "reasons_income_mortgage": Why income/mortgage protection was ${isROA ? "implemented" : "recommended"}. Cover both IP and MP if both apply.
- "reasons_aic": Why accidental injury cover was ${isROA ? "included" : "recommended"}.
- "pros_life": Pros of the life cover change (HTML <ul><li> list, 3-5 points)
- "cons_life": Cons / trade-offs of life cover (HTML <ul><li> list, 3-5 points)
- "pros_trauma": Pros of trauma cover
- "cons_trauma": Cons of trauma cover
- "pros_tpd": Pros of TPD cover
- "cons_tpd": Cons of TPD cover
- "pros_income_mp": Pros of income/mortgage protection
- "cons_income_mp": Cons of income/mortgage protection
- "pros_aic": Pros of accidental injury cover
- "cons_aic": Cons of accidental injury cover
- "modification_notes": Deviations or modifications from original plan (if any)
- "summary": Overall summary of what was ${isROA ? "implemented" : "recommended"}

Also return "meta" with "document_title" and "client_name".

FACT PACK DATA:
${JSON.stringify(factPack, null, 2)}

Return ONLY valid JSON.`;
}

export class AnthropicProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<FactPack> {
    const prompt = buildExtractPrompt(input);
    console.log(`[Anthropic Extractor] Using model: ${MODEL}`);
    console.log(`[Anthropic Extractor] Prompt length: ${prompt.length} chars`);

    let response;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        temperature: 0,
        system: EXTRACTOR_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (apiError: unknown) {
      const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.error(`[Anthropic Extractor] API CALL FAILED: ${errMsg}`);
      throw new Error(`Anthropic API call failed: ${errMsg}`);
    }

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    console.log(`[Anthropic Extractor] Response length: ${text.length}`);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Anthropic Extractor] No JSON found in response. First 500 chars:", text.substring(0, 500));
      throw new Error("No JSON found in extractor response");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[Anthropic Extractor] JSON parse failed:", e);
      throw new Error("Invalid JSON in extractor response");
    }

    console.log("[Anthropic Extractor] Parsed keys:", Object.keys(parsed));

    // Try strict schema first
    const result = FactPackSchema.safeParse(parsed);
    if (result.success) {
      console.log("[Anthropic Extractor] Schema validation passed");
      return result.data;
    }

    console.warn("[Anthropic Extractor] Schema validation failed:", result.error.issues.slice(0, 5).map(i => `${i.path.join(".")}: ${i.message}`));

    // FORGIVING FALLBACK: Accept whatever structure the LLM returned and
    // map it into the FactPack format as best we can
    console.log("[Anthropic Extractor] Attempting forgiving parse...");
    try {
      return forgivingParse(parsed);
    } catch (e) {
      console.error("[Anthropic Extractor] Forgiving parse also failed:", e);
    }

    // Retry once with simplified prompt
    console.log("[Anthropic Extractor] Retrying with simplified prompt...");
    const retryResponse = await client.messages.create({
      model: MODEL, max_tokens: 8000, temperature: 0,
      messages: [
        { role: "user", content: `${prompt}\n\nIMPORTANT: Return a simple JSON with these top-level keys: clients (array), existingCover (array), recommendedCover (array), specialInstructions (string), missingFields (array). Each client needs: clientLabel, fullName, email, phone. Each cover block needs: clientName, insurer, covers (array of {coverType, sumInsured}), premiumAmount (number), premiumFrequency (string).` },
      ],
    });

    const retryText = retryResponse.content[0]?.type === "text" ? retryResponse.content[0].text : "";
    const retryMatch = retryText.match(/\{[\s\S]*\}/);
    if (retryMatch) {
      try {
        const retryParsed = JSON.parse(retryMatch[0]);
        const retryResult = FactPackSchema.safeParse(retryParsed);
        if (retryResult.success) return retryResult.data;
        return forgivingParse(retryParsed);
      } catch { /* fall through */ }
    }

    return FactPackSchema.parse({ clients: [], missingFields: ["Full extraction failed — review manually"] });
  }

  async writeSections(factPack: FactPack, docType: string): Promise<WriterOutput> {
    const prompt = buildWriterPrompt(factPack, docType);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0.25,
      system: WRITER_SYSTEM,
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
