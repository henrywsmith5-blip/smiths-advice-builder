import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ExtractInput } from "./provider";
import { ExtractedJsonSchema, WriterOutputSchema } from "./schemas";
import type { ExtractedJson, WriterOutput } from "./schemas";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class AnthropicProvider implements LLMProvider {
  async extractCaseJson(input: ExtractInput): Promise<ExtractedJson> {
    const parts: string[] = [];
    parts.push(`Extract structured JSON from the following NZ insurance documents. Document type: ${input.docType}`);

    if (input.clientOverrides?.name) {
      parts.push(`Client: ${input.clientOverrides.name}`);
      if (input.clientOverrides.nameB) parts.push(`Partner: ${input.clientOverrides.nameB}`);
    }
    if (input.firefliesText) parts.push(`TRANSCRIPT:\n${input.firefliesText.substring(0, 50000)}`);
    if (input.quotesText) parts.push(`QUOTES:\n${input.quotesText.substring(0, 50000)}`);
    if (input.otherDocsText) parts.push(`OTHER DOCS:\n${input.otherDocsText.substring(0, 30000)}`);
    if (input.additionalContext) parts.push(`CONTEXT:\n${input.additionalContext.substring(0, 10000)}`);
    if (input.roaDeviations) parts.push(`ROA DEVIATIONS:\n${input.roaDeviations.substring(0, 10000)}`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `${parts.join("\n\n")}\n\nReturn ONLY valid JSON matching the extraction schema. Never fabricate numbers.`,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Anthropic response");

    const parsed = JSON.parse(jsonMatch[0]);
    const result = ExtractedJsonSchema.safeParse(parsed);
    if (result.success) return result.data;

    return ExtractedJsonSchema.parse({
      client: {},
      doc_type: input.docType,
      sections: {},
      unknowns: ["Extraction validation failed"],
    });
  }

  async writeSections(extractedJson: ExtractedJson, docType: string): Promise<WriterOutput> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `Write professional NZ insurance advisory sections for a ${docType} document.
Use ${docType === "SOA" ? "future" : "past"} tense.
Data: ${JSON.stringify(extractedJson, null, 2)}
Return JSON with "sections" object and "meta" object.`,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Anthropic writer response");

    const parsed = JSON.parse(jsonMatch[0]);
    const result = WriterOutputSchema.safeParse(parsed);
    if (result.success) return result.data;

    return { sections: {}, meta: { document_title: `${docType} Document` } };
  }
}
