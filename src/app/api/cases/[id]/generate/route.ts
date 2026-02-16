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

    // #region agent log
    const debugInfo: Record<string, unknown> = {};
    debugInfo.inputLengths = {
      additionalContext: (body.additionalContext || "").length,
      firefliesText: (body.firefliesText || "").length,
      clientAName: body.clientAName || caseRecord.clientAName || "NOT SET",
      clientType: body.clientType || caseRecord.clientType,
      clientAHasExisting: body.clientAHasExisting ?? caseRecord.clientAHasExisting,
      clientBHasExisting: body.clientBHasExisting ?? caseRecord.clientBHasExisting,
    };
    console.log("[Generate Debug] Input:", JSON.stringify(debugInfo.inputLengths));
    // #endregion

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
      clientType: (body.clientType || caseRecord.clientType) === "PARTNER" ? ClientType.PARTNER : ClientType.INDIVIDUAL,
      clientAHasExisting: body.clientAHasExisting ?? caseRecord.clientAHasExisting ?? false,
      clientBHasExisting: body.clientBHasExisting ?? caseRecord.clientBHasExisting ?? false,
      saveCase: body.saveCase ?? true,
    });

    // Return validation results alongside doc info
    const status = result.validation.valid ? 200 : 422;

    // #region agent log
    debugInfo.pipelineResult = {
      docId: result.docId,
      validationValid: result.validation.valid,
      validationErrors: result.validation.errors,
      validationWarnings: result.validation.warnings,
      premiumSummary: result.premiumSummary,
      htmlLength: result.renderedHtml?.length || 0,
    };
    console.log("[Generate Debug] Result:", JSON.stringify(debugInfo.pipelineResult));
    // #endregion

    return NextResponse.json({
      docId: result.docId,
      hasPdf: result.validation.valid,
      validation: result.validation,
      premiumSummary: result.premiumSummary,
      _debug: debugInfo,
    }, { status });
  } catch (error) {
    console.error("[Generate] CAUGHT ERROR:", error);
    // #region agent log
    const errDetail = error instanceof Error ? { message: error.message, stack: error.stack?.substring(0, 500) } : String(error);
    console.error("[Generate Debug] Error detail:", JSON.stringify(errDetail));
    // #endregion
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed", _debug: { caughtError: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}
