import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePdf } from "@/lib/pdf/generator";

// GET /api/docs/:docId/pdf
// Generates PDF on-the-fly from stored HTML (no filesystem dependency)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;

  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: docId },
      include: { case: { select: { clientAName: true, title: true } } },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!doc.renderedHtml) {
      return NextResponse.json({ error: "No HTML available to generate PDF" }, { status: 404 });
    }

    // Generate PDF on-the-fly from the stored HTML
    const pdfBuffer = await generatePdf(doc.renderedHtml);
    const filename = `${doc.docType}_${doc.case.clientAName || "Client"}_${new Date(doc.createdAt).toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[PDF Download] Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
