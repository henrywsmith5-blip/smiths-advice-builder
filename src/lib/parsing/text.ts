export function extractTextFromBuffer(buffer: Buffer, filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "txt" || ext === "md" || ext === "text" || ext === "markdown") {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(`Unsupported text file format: .${ext}`);
}
