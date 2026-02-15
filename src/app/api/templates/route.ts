import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DocType, ClientType } from "@prisma/client";
import { getDefaultTemplate } from "@/lib/templates/defaults";

// Built-in template configs
const BUILT_IN_TEMPLATES = [
  { docType: DocType.SOA, clientType: ClientType.INDIVIDUAL, name: "SOA - Individual (Built-in)" },
  { docType: DocType.SOA, clientType: ClientType.PARTNER, name: "SOA - Partner (Built-in)" },
  { docType: DocType.ROA, clientType: ClientType.INDIVIDUAL, name: "ROA - Individual (Built-in)" },
  { docType: DocType.ROA, clientType: ClientType.PARTNER, name: "ROA - Partner (Built-in)" },
  { docType: DocType.SOE, clientType: null, name: "SOE (Built-in)" },
];

// GET /api/templates?docType=SOA&clientType=INDIVIDUAL
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const docType = url.searchParams.get("docType") as DocType | null;
    const clientType = url.searchParams.get("clientType") as ClientType | null;

    const where: Record<string, unknown> = {};
    if (docType) where.docType = docType;
    if (clientType) where.clientType = clientType;

    const dbTemplates = await prisma.template.findMany({
      where,
      orderBy: [{ docType: "asc" }, { clientType: "asc" }, { version: "desc" }],
    });

    // For any (docType, clientType) combo that has no DB template,
    // return the built-in default so it shows in the editor
    const templates = [...dbTemplates];

    for (const bi of BUILT_IN_TEMPLATES) {
      const hasDb = dbTemplates.some(
        (t) => t.docType === bi.docType && t.clientType === bi.clientType
      );
      if (!hasDb) {
        // Filter by query params if provided
        if (docType && bi.docType !== docType) continue;
        if (clientType && bi.clientType !== clientType) continue;

        const def = getDefaultTemplate(bi.docType, bi.clientType);
        templates.push({
          id: `builtin-${bi.docType}-${bi.clientType || "null"}`,
          docType: bi.docType,
          clientType: bi.clientType,
          name: bi.name,
          html: def.html,
          css: def.css,
          version: 0,
          isActive: true,
          createdAt: new Date(),
        });
      }
    }

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
