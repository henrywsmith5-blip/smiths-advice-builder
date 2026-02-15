import { extractTextFromPdf } from "./pdf";
import { extractTextFromBuffer } from "./text";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File ${filename} exceeds 20MB limit`);
  }

  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    return extractTextFromPdf(buffer);
  }

  if (ext === "txt" || ext === "md" || ext === "text" || ext === "markdown") {
    return extractTextFromBuffer(buffer, filename);
  }

  throw new Error(`Unsupported file type: .${ext}. Supported: pdf, txt, md`);
}

export async function parseFiles(
  files: { buffer: Buffer; filename: string }[]
): Promise<string> {
  const texts: string[] = [];

  for (const file of files) {
    try {
      const text = await parseFile(file.buffer, file.filename);
      if (text) {
        texts.push(`--- ${file.filename} ---\n${text}`);
      }
    } catch (error) {
      console.error(`Error parsing ${file.filename}:`, error);
      texts.push(`--- ${file.filename} --- [PARSE ERROR]`);
    }
  }

  return texts.join("\n\n");
}
