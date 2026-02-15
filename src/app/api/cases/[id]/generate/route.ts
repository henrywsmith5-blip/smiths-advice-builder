import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runGenerationPipeline } from "@/lib/generation/pipeline";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/auth";
import { DocType, ClientType } from "@prisma/client";

// POST /api/cases/:id/generate?docType=SOA
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Rate limit
  const session = await getSession();
  const rl = rateLimit(`generate:${session.userId}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a minute." },
      { status: 429 }
    );
  }

  try {
    const url = new URL(request.url);
    const docTypeParam = url.searchParams.get("docType")?.toUpperCase();

    if (!docTypeParam || !["SOA", "ROA", "SOE"].includes(docTypeParam)) {
      return NextResponse.json(
        { error: "Invalid docType. Must be SOA, ROA, or SOE." },
        { status: 400 }
      );
    }

    const docType = docTypeParam as DocType;

    // Get the case
    const caseRecord = await prisma.case.findUnique({ where: { id } });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Parse body for any additional inputs
    const body = await request.json().catch(() => ({}));

    const result = await runGenerationPipeline({
      caseId: id,
      docType,
      firefliesText: body.firefliesText || caseRecord.firefliesText || "",
      quotesText: body.quotesText || caseRecord.quotesText || "",
      otherDocsText: body.otherDocsText || caseRecord.otherDocsText || "",
      additionalContext: body.additionalContext || caseRecord.additionalContext || "",
      roaDeviations: body.roaDeviations || caseRecord.roaDeviations || "",
      clientOverrides: {
        name: body.clientAName || caseRecord.clientAName || undefined,
        nameB: body.clientBName || caseRecord.clientBName || undefined,
        email: body.clientEmail || caseRecord.clientEmail || undefined,
      },
      clientType: caseRecord.clientType || ClientType.INDIVIDUAL,
      clientAHasExisting: body.clientAHasExisting ?? caseRecord.clientAHasExisting ?? false,
      clientBHasExisting: body.clientBHasExisting ?? caseRecord.clientBHasExisting ?? false,
      saveCase: body.saveCase ?? true,
    });

    console.log(`[Generate] ${docType} complete for case ${id}, docId: ${result.docId}`);

    return NextResponse.json({
      docId: result.docId,
      renderedHtmlPreview: result.renderedHtml.substring(0, 200) + "...",
      hasPdf: !!result.pdfPath,
    });
  } catch (error) {
    console.error("[Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
