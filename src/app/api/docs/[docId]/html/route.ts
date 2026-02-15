import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/docs/:docId/html
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;

  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: docId },
      include: { case: { select: { clientAName: true } } },
    });

    if (!doc || !doc.renderedHtml) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const filename = `${doc.docType}_${doc.case.clientAName || "Client"}_${new Date(doc.createdAt).toISOString().slice(0, 10)}.html`;

    return new NextResponse(doc.renderedHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to download HTML" }, { status: 500 });
  }
}
