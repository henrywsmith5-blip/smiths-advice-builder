import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DocType } from "@prisma/client";
import { getDefaultTemplate } from "@/lib/templates/defaults";

// Built-in template configs (one per doc type — conditionals handle variants)
const BUILT_IN_TEMPLATES: Array<{
  docType: DocType;
  name: string;
}> = [
  { docType: DocType.SOA, name: "Statement of Advice" },
  { docType: DocType.ROA, name: "Record of Advice" },
  { docType: DocType.SOE, name: "Scope of Engagement" },
];

// GET /api/templates
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const docType = url.searchParams.get("docType") as DocType | null;

    const where: Record<string, unknown> = {};
    if (docType) where.docType = docType;

    const dbTemplates = await prisma.template.findMany({
      where,
      orderBy: [{ docType: "asc" }, { version: "desc" }],
    });

    const templates = [...dbTemplates];

    // Add built-in defaults for any docType that has no DB template
    for (const bi of BUILT_IN_TEMPLATES) {
      if (docType && bi.docType !== docType) continue;
      const hasDb = dbTemplates.some((t) => t.docType === bi.docType && t.isActive);
      if (!hasDb) {
        const def = getDefaultTemplate(bi.docType, null);
        templates.push({
          id: `builtin-${bi.docType}`,
          docType: bi.docType,
          clientType: null,
          hasCover: null,
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
    const { docType, name, html, css } = body;

    if (!docType || !html) {
      return NextResponse.json({ error: "docType and html are required" }, { status: 400 });
    }

    // Deactivate previous active templates of same docType
    await prisma.template.updateMany({
      where: { docType, isActive: true },
      data: { isActive: false },
    });

    const latest = await prisma.template.findFirst({
      where: { docType },
      orderBy: { version: "desc" },
    });

    const newVersion = (latest?.version || 0) + 1;

    const template = await prisma.template.create({
      data: {
        docType,
        clientType: null,
        hasCover: null,
        name: name || `${docType} Template v${newVersion}`,
        html,
        css: css || "",
        version: newVersion,
        isActive: true,
      },
    });

    // Keep only last 10 versions
    const allVersions = await prisma.template.findMany({
      where: { docType },
      orderBy: { version: "desc" },
    });

    if (allVersions.length > 10) {
      const toDelete = allVersions.slice(10).map((t) => t.id);
      await prisma.template.deleteMany({ where: { id: { in: toDelete } } });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}
