import Anthropic from "@anthropic-ai/sdk";
import type { KiwisaverFactPack } from "./kiwisaver-schemas";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

export interface KiwisaverWriterOutput {
  sections: Record<string, { included: boolean; html: string }>;
}

function buildKiwisaverWriterPrompt(factPack: KiwisaverFactPack): string {
  return `You are Craig Smith, a professional NZ financial adviser writing for Smiths Insurance & KiwiSaver.

TASK: Write polished HTML content sections for a KiwiSaver Statement of Advice.

TENSE: FUTURE tense (we recommend, will provide).
TONE: Professional NZ financial adviser. Concise, clear, authoritative. Mid-formal - professional but accessible. You genuinely care about your clients' financial futures.
FORMAT: Return HTML fragments ONLY - use <p>, <ul>, <li>, <strong>, <em>. No <html>, <body>, <head>.

RULES:
1. NEVER invent numbers. Use ONLY what is in the data below.
2. Keep paragraphs 2-4 sentences. Be direct but warm.
3. Use NZ English spelling (favour, analyse, organise).
4. Address client as "you" / "your". Use "I" for personal actions. "we" for firm scope.
5. NEVER use the em dash character (\\u2014). It is strictly banned. Use a normal hyphen (-) or rewrite the sentence instead.
6. Write as if you are talking to the client directly across the desk. Not formal legal language - practical financial advice.
7. Reference the client's specific situation, goals, and timeframe when explaining recommendations.

EXTRACTED DATA:
${JSON.stringify(factPack, null, 2)}

Return JSON with "sections" object. Each key maps to { "included": boolean, "html": "..." }.

SECTION KEYS:
- "special_instructions": Client objectives narrative. Explain the purpose of the meeting, what the client wants, and what we discussed. 2-3 paragraphs. Reference their specific goal (e.g. retirement), timeframe, and current situation.
- "recommendation_summary": Why we recommend the specific fund/provider. Explain the rationale tied to their risk profile, goals, and timeframe. 2-3 paragraphs. Be specific about why this fund suits them.
- "projections_explanation": What the projection numbers mean in practical terms for the client. 1-2 paragraphs. Keep it grounded and realistic - emphasise that projections are estimates only.
- "risk_profile_narrative": Explain the client's risk profile assessment. Cover: (a) their risk tolerance (emotional comfort with market ups and downs), (b) their risk capacity (financial ability to withstand losses - income stability, timeframe, other resources), (c) how these combine to determine the recommended fund type. Reference their specific situation. 2-3 paragraphs.
- "strategy_narrative": Personalised KiwiSaver strategy advice for the client. Cover contribution rate recommendation (referencing upcoming rate changes if relevant), government contribution maximisation strategy (contribute $1,042.86 between 1 July-30 June for max $260.72), PIR confirmation, and if relevant, first-home vs retirement priority discussion. Be specific to their situation. 2-4 paragraphs.

Return ONLY valid JSON. No markdown.`;
}

export async function writeKiwisaverSections(factPack: KiwisaverFactPack): Promise<KiwisaverWriterOutput> {
  const prompt = buildKiwisaverWriterPrompt(factPack);

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

  const sections: Record<string, { included: boolean; html: string }> = {};
  if (parsed.sections) {
    for (const [key, val] of Object.entries(parsed.sections)) {
      const v = val as { included?: boolean; html?: string };
      sections[key] = {
        included: v.included !== false,
        html: v.html || "",
      };
    }
  }

  return { sections };
}
