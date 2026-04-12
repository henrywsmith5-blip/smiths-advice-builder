import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ClientType } from "@prisma/client";

// GET /api/cases - List cases for the logged-in user
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cases = await prisma.case.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        clientType: true,
        clientAName: true,
        clientBName: true,
        clientEmail: true,
        createdAt: true,
        updatedAt: true,
        documents: {
          select: { id: true, docType: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ cases });
  } catch {
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

// POST /api/cases - Create a new case for the logged-in user
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const newCase = await prisma.case.create({
      data: {
        userId: session.userId,
        title: body.title || `New Case — ${new Date().toLocaleDateString("en-NZ")}`,
        clientType: body.clientType === "PARTNER" ? ClientType.PARTNER : ClientType.INDIVIDUAL,
        clientAName: body.clientAName || null,
        clientBName: body.clientBName || null,
        clientEmail: body.clientEmail || null,
      },
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
