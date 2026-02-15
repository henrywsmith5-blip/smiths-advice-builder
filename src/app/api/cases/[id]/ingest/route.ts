import { NextRequest, NextResponse } from "next/server";
import { parseFiles } from "@/lib/parsing";

// POST /api/cases/:id/ingest - Upload and parse files
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // validate route param exists

  try {
    const formData = await request.formData();

    const results: Record<string, string> = {};

    // Parse fireflies files
    const firefliesFiles = formData.getAll("fireflies") as File[];
    if (firefliesFiles.length > 0) {
      const buffers = await Promise.all(
        firefliesFiles.map(async (f) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          filename: f.name,
        }))
      );
      results.firefliesText = await parseFiles(buffers);
    }

    // Parse quote files
    const quoteFiles = formData.getAll("quotes") as File[];
    if (quoteFiles.length > 0) {
      const buffers = await Promise.all(
        quoteFiles.map(async (f) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          filename: f.name,
        }))
      );
      results.quotesText = await parseFiles(buffers);
    }

    // Parse other doc files
    const otherFiles = formData.getAll("others") as File[];
    if (otherFiles.length > 0) {
      const buffers = await Promise.all(
        otherFiles.map(async (f) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          filename: f.name,
        }))
      );
      results.otherDocsText = await parseFiles(buffers);
    }

    // Paste text for fireflies
    const pasteText = formData.get("firefliesPaste") as string | null;
    if (pasteText) {
      results.firefliesText = results.firefliesText
        ? `${pasteText}\n\n${results.firefliesText}`
        : pasteText;
    }

    return NextResponse.json({
      ok: true,
      extracted: {
        firefliesLength: results.firefliesText?.length || 0,
        quotesLength: results.quotesText?.length || 0,
        otherDocsLength: results.otherDocsText?.length || 0,
      },
      texts: results,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 }
    );
  }
}
