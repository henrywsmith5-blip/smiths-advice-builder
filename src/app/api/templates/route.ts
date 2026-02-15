import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DocType, ClientType } from "@prisma/client";
import { getDefaultTemplate } from "@/lib/templates/defaults";

// All built-in template configs (4 SOA + 2 ROA + 1 SOE)
const BUILT_IN_TEMPLATES: Array<{
  docType: DocType;
  clientType: ClientType | null;
  hasCover: boolean | null;
  name: string;
}> = [
  { docType: DocType.SOA, clientType: ClientType.INDIVIDUAL, hasCover: false, name: "SOA — Individual, No Cover" },
  { docType: DocType.SOA, clientType: ClientType.INDIVIDUAL, hasCover: true, name: "SOA — Individual, With Cover" },
  { docType: DocType.SOA, clientType: ClientType.PARTNER, hasCover: false, name: "SOA — Partner, No Cover" },
  { docType: DocType.SOA, clientType: ClientType.PARTNER, hasCover: true, name: "SOA — Partner, With Cover" },
  { docType: DocType.ROA, clientType: ClientType.INDIVIDUAL, hasCover: null, name: "ROA — Individual" },
  { docType: DocType.ROA, clientType: ClientType.PARTNER, hasCover: null, name: "ROA — Partner" },
  { docType: DocType.SOE, clientType: null, hasCover: null, name: "SOE — Scope of Engagement" },
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
      orderBy: [{ docType: "asc" }, { clientType: "asc" }, { version: "desc" }],
    });

    // For any combo that has no DB template, return the built-in default
    const templates = [...dbTemplates];

    for (const bi of BUILT_IN_TEMPLATES) {
      if (docType && bi.docType !== docType) continue;

      const hasDb = dbTemplates.some(
        (t) =>
          t.docType === bi.docType &&
          t.clientType === bi.clientType &&
          t.hasCover === bi.hasCover
      );
      if (!hasDb) {
        const def = getDefaultTemplate(bi.docType, bi.clientType, bi.hasCover);
        templates.push({
          id: `builtin-${bi.docType}-${bi.clientType || "null"}-${bi.hasCover ?? "null"}`,
          docType: bi.docType,
          clientType: bi.clientType,
          hasCover: bi.hasCover,
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
    const { docType, clientType, hasCover, name, html, css } = body;

    if (!docType || !html) {
      return NextResponse.json({ error: "docType and html are required" }, { status: 400 });
    }

    const hc = hasCover === true ? true : hasCover === false ? false : null;

    // Deactivate previous active templates of same type
    await prisma.template.updateMany({
      where: { docType, clientType: clientType || null, hasCover: hc, isActive: true },
      data: { isActive: false },
    });

    const latest = await prisma.template.findFirst({
      where: { docType, clientType: clientType || null, hasCover: hc },
      orderBy: { version: "desc" },
    });

    const newVersion = (latest?.version || 0) + 1;

    const template = await prisma.template.create({
      data: {
        docType,
        clientType: clientType || null,
        hasCover: hc,
        name: name || `${docType} Template v${newVersion}`,
        html,
        css: css || "",
        version: newVersion,
        isActive: true,
      },
    });

    // Keep only last 10 versions
    const allVersions = await prisma.template.findMany({
      where: { docType, clientType: clientType || null, hasCover: hc },
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
