import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";

// GET /api/docs/:docId/pdf
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

    if (!doc.pdfPath) {
      return NextResponse.json({ error: "PDF not available" }, { status: 404 });
    }

    const pdfBuffer = await fs.readFile(doc.pdfPath);
    const filename = `${doc.docType}_${doc.case.clientAName || "Client"}_${new Date(doc.createdAt).toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to download PDF" }, { status: 500 });
  }
}
