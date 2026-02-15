import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/cases/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!c) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: c });
  } catch {
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }
}

// PATCH /api/cases/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const updated = await prisma.case.update({
      where: { id },
      data: {
        title: body.title,
        clientType: body.clientType,
        clientAName: body.clientAName,
        clientBName: body.clientBName,
        clientEmail: body.clientEmail,
        clientAHasExisting: body.clientAHasExisting,
        clientBHasExisting: body.clientBHasExisting,
        additionalContext: body.additionalContext,
        roaDeviations: body.roaDeviations,
      },
    });

    return NextResponse.json({ case: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}

// DELETE /api/cases/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.case.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete case" }, { status: 500 });
  }
}
