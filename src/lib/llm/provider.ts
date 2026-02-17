import type { ExtractedJson, WriterOutput } from "./schemas";

export interface LLMProvider {
  extractCaseJson(input: ExtractInput): Promise<ExtractedJson>;
  writeSections(extractedJson: ExtractedJson, docType: string): Promise<WriterOutput>;
}

export interface ExtractInput {
  clientOverrides?: {
    name?: string;
    nameB?: string;
    email?: string;
  };
  firefliesText?: string;
  quotesText?: string;
  otherDocsText?: string;
  additionalContext?: string;
  roaDeviations?: string;
  docType: "SOA" | "ROA" | "SOE" | "KIWISAVER";
}

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "openai";

  if (provider === "anthropic") {
    // Lazy import to avoid loading SDK if not used
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AnthropicProvider } = require("./anthropic");
    return new AnthropicProvider();
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OpenAIProvider } = require("./openai");
  return new OpenAIProvider();
}
