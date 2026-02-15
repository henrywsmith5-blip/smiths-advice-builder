import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DocType, ClientType } from "@prisma/client";

// GET /api/templates?docType=SOA&clientType=INDIVIDUAL
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const docType = url.searchParams.get("docType") as DocType | null;
    const clientType = url.searchParams.get("clientType") as ClientType | null;

    const where: Record<string, unknown> = {};
    if (docType) where.docType = docType;
    if (clientType) where.clientType = clientType;

    const templates = await prisma.template.findMany({
      where,
      orderBy: [{ docType: "asc" }, { clientType: "asc" }, { version: "desc" }],
    });

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/templates - Save new version
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docType, clientType, name, html, css } = body;

    if (!docType || !html) {
      return NextResponse.json(
        { error: "docType and html are required" },
        { status: 400 }
      );
    }

    // Deactivate previous active templates of same type
    await prisma.template.updateMany({
      where: {
        docType,
        clientType: clientType || null,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Get the latest version number
    const latest = await prisma.template.findFirst({
      where: { docType, clientType: clientType || null },
      orderBy: { version: "desc" },
    });

    const newVersion = (latest?.version || 0) + 1;

    const template = await prisma.template.create({
      data: {
        docType,
        clientType: clientType || null,
        name: name || `${docType} Template v${newVersion}`,
        html,
        css: css || "",
        version: newVersion,
        isActive: true,
      },
    });

    // Keep only last 10 versions
    const allVersions = await prisma.template.findMany({
      where: { docType, clientType: clientType || null },
      orderBy: { version: "desc" },
    });

    if (allVersions.length > 10) {
      const toDelete = allVersions.slice(10).map((t) => t.id);
      await prisma.template.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}
