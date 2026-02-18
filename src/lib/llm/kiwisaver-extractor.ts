import Anthropic from "@anthropic-ai/sdk";
import { KiwisaverFactPackSchema, type KiwisaverFactPack } from "./kiwisaver-schemas";
import type { ExtractInput } from "./provider";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

function buildKiwisaverExtractPrompt(input: ExtractInput): string {
  const nzDate = new Date().toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let prompt = `You are a data extraction specialist for Smiths Insurance & KiwiSaver, a New Zealand financial advice provider.

TASK: Extract structured KiwiSaver data from the provided documents into the EXACT JSON format below.
DOCUMENT TYPE: KiwiSaver Statement of Advice

CRITICAL RULES:
1. NEVER invent or guess numbers. If not explicitly stated, use null.
2. Extract ONLY facts. No calculations. No assumptions.
3. Any unknown field = null. Never fabricate.
4. Monetary values include "$" formatted as they appear (e.g. "$45,000", "$120,000").
5. Percentage values include "%" (e.g. "3%", "6%").
6. If a value cannot be found, use null and ADD it to "missing_fields".
7. isPartner is false (KiwiSaver SOA is individual only).
8. Do NOT let assumptions or general knowledge fill gaps - extract only what is stated.
9. NEVER use the em dash character (\\u2014). Use a normal hyphen (-) instead.

TODAY'S DATE: ${nzDate}

YOU MUST RETURN THIS EXACT JSON STRUCTURE:
{
  "caseMeta": {
    "isPartner": false,
    "adviceDate": "${nzDate}",
    "meetingDate": "date of meeting or null",
    "dataAsAtDate": "${nzDate}",
    "documentType": "KiwiSaver SOA"
  },
  "clients": [
    {
      "id": "A",
      "name": "Client full name or null",
      "email": "email or null",
      "phone": "phone or null",
      "age": 55,
      "employmentStatus": "Employed / Self-employed / Not employed or null",
      "incomeAnnual": "$85,000 or null",
      "employeeContrib": "3% or null",
      "employerContrib": "3% or null",
      "pir": "28% or 17.5% or 10.5% or null",
      "goal": "Retirement or First home or null",
      "timeframe": "11 years or null",
      "firstHomeIntention": true or false or null,
      "firstHomeTimeframe": "2-3 years or null (only if first home goal)",
      "riskProfileOutcome": "Growth or Balanced or Conservative etc. or null",
      "riskTolerance": "High / Medium / Low or description of comfort with volatility or null",
      "riskCapacity": "High / Medium / Low or description of financial ability to withstand loss or null",
      "esgPreference": "Any stated ESG/responsible investing preference or null",
      "otherAssetsDebts": "Summary of other assets and debts mentioned or null",
      "emergencyFund": "Has emergency fund? Amount or description or null",
      "recommendedContribRate": "Recommended contribution rate e.g. 6% or null",
      "current": {
        "provider": "Fisher Funds or null",
        "fund": "Growth Fund or null",
        "balance": "$120,000 or null"
      },
      "recommended": {
        "provider": "Milford or null",
        "fund": "Active Growth Fund or null"
      },
      "projections": {
        "projectedBalance": "$250,000 or null",
        "projectedWeeklyIncome": "$480 or null",
        "assumptions": "6% return, 3% contribution or null"
      },
      "scopeSelections": {
        "riskProfile": true,
        "fundReview": true,
        "contributions": false,
        "withdrawals": false,
        "limitedAdvice": true
      }
    }
  ],
  "narrativeInputs": {
    "specialInstructionsHtml": "Client objectives or null",
    "recommendationSummaryParagraph": null,
    "projectionsExplanationParagraph": null,
    "riskProfileNarrativeHtml": null,
    "strategyNarrativeHtml": null
  },
  "missing_fields": []
}

IMPORTANT: Return ONLY the JSON object. No markdown code fences. No explanation. Just the raw JSON starting with { and ending with }.`;

  if (input.additionalContext) {
    prompt += `\n\n=== ADDITIONAL CONTEXT (PRIMARY AUTHORITATIVE SOURCE) ===\n${input.additionalContext}`;
  }

  if (input.clientOverrides?.name) {
    prompt += `\n\n=== CLIENT NAME OVERRIDES ===\nClient: ${input.clientOverrides.name}`;
    if (input.clientOverrides.email) prompt += `\nEmail: ${input.clientOverrides.email}`;
  }

  if (input.firefliesText) {
    prompt += `\n\n=== MEETING TRANSCRIPT ===\n${input.firefliesText.substring(0, 80000)}`;
  }

  if (input.quotesText) {
    prompt += `\n\n=== DOCUMENTS / FACT FIND ===\n${input.quotesText.substring(0, 80000)}`;
  }

  if (input.otherDocsText) {
    prompt += `\n\n=== OTHER DOCUMENTS ===\n${input.otherDocsText.substring(0, 40000)}`;
  }

  return prompt;
}

export async function extractKiwisaverData(input: ExtractInput): Promise<KiwisaverFactPack> {
  const prompt = buildKiwisaverExtractPrompt(input);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return KiwisaverFactPackSchema.parse(parsed);
}
