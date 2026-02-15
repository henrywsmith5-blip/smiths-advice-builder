/* eslint-disable @typescript-eslint/no-explicit-any */

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2 has ESM export changes
    const pdfParse = await import("pdf-parse").then(
      (m) => (m as any).default || (m as any)
    );
    const data = await pdfParse(buffer);
    return (data as any).text?.trim() || "";
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF file");
  }
}
