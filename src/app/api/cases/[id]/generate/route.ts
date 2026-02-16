import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runGenerationPipeline } from "@/lib/generation/pipeline";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/auth";
import { DocType, ClientType } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  const rl = rateLimit(`generate:${session.userId}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded. Wait a minute." }, { status: 429 });
  }

  try {
    const url = new URL(request.url);
    const docTypeParam = url.searchParams.get("docType")?.toUpperCase();

    if (!docTypeParam || !["SOA", "ROA", "SOE"].includes(docTypeParam)) {
      return NextResponse.json({ error: "Invalid docType" }, { status: 400 });
    }

    const caseRecord = await prisma.case.findUnique({ where: { id } });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // Use body clientType if provided (from UI toggle), fallback to case record
    const clientType = (body.clientType === "PARTNER" || caseRecord.clientType === "PARTNER")
      ? ClientType.PARTNER
      : ClientType.INDIVIDUAL;

    console.log(`[Generate] Starting: docType=${docTypeParam}, clientType=${clientType}, additionalContext=${(body.additionalContext || "").length} chars`);

    const result = await runGenerationPipeline({
      caseId: id,
      docType: docTypeParam as DocType,
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
      clientType,
      clientAHasExisting: body.clientAHasExisting ?? caseRecord.clientAHasExisting ?? false,
      clientBHasExisting: body.clientBHasExisting ?? caseRecord.clientBHasExisting ?? false,
      saveCase: body.saveCase ?? true,
    });

    console.log(`[Generate] Complete: docId=${result.docId}`);

    return NextResponse.json({
      docId: result.docId,
      renderedHtmlPreview: result.renderedHtml.substring(0, 200) + "...",
      hasPdf: !!result.pdfPath,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Generation failed";
    const stack = error instanceof Error ? error.stack?.substring(0, 300) : "";
    console.error(`[Generate] FAILED: ${msg}\n${stack}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
