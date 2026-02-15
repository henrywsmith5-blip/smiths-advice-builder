import nunjucks from "nunjucks";
import { prisma } from "@/lib/db";
import { DocType, ClientType } from "@prisma/client";
import { getDefaultTemplate } from "./defaults";

// Configure Nunjucks with no file system access (render from strings)
const env = new nunjucks.Environment(null, {
  autoescape: false, // HTML templates should not be escaped
  throwOnUndefined: false,
});

export interface RenderContext {
  // Client info
  CLIENT_A_NAME?: string;
  CLIENT_B_NAME?: string;
  CLIENT_NAME?: string;
  CLIENT_EMAIL?: string;
  CLIENT_PHONE?: string;
  DATE?: string;
  SIGNOFF_DATE?: string;
  ENGAGEMENT_DATE?: string;

  // Adviser info
  ADVISER_NAME?: string;
  ADVISER_EMAIL?: string;
  ADVISER_PHONE?: string;
  ADVISER_FSP?: string;

  // Cover logic (global)
  HAS_EXISTING_COVER?: boolean;
  NEW_COVER_ONLY?: boolean;

  // Section includes
  LIFE_INCLUDED?: boolean;
  TRAUMA_INCLUDED?: boolean;
  TPD_INCLUDED?: boolean;
  INCOME_MP_INCLUDED?: boolean;
  IP_INCLUDED?: boolean;
  MP_INCLUDED?: boolean;
  AIC_INCLUDED?: boolean;
  PREMIUM_COVER_INCLUDED?: boolean;

  // Section HTML snippets (from LLM writer)
  [key: string]: unknown;
}

export async function renderTemplate(
  docType: DocType,
  clientType: ClientType | null,
  context: RenderContext
): Promise<string> {
  // Try to fetch active template from DB
  let templateHtml: string | null = null;
  let templateCss: string = "";

  try {
    const tmpl = await prisma.template.findFirst({
      where: {
        docType,
        clientType: clientType,
        isActive: true,
      },
      orderBy: { version: "desc" },
    });

    if (tmpl) {
      templateHtml = tmpl.html;
      templateCss = tmpl.css;
    }
  } catch {
    // DB not available, use defaults
  }

  // Fallback to built-in defaults
  if (!templateHtml) {
    const def = getDefaultTemplate(docType, clientType);
    templateHtml = def.html;
    templateCss = def.css;
  }

  // Inject CSS if separate
  if (templateCss) {
    const styleTag = `<style>${templateCss}</style>`;
    if (templateHtml.includes("</head>")) {
      templateHtml = templateHtml.replace("</head>", `${styleTag}\n</head>`);
    } else {
      templateHtml = styleTag + templateHtml;
    }
  }

  // Add print CSS baseline
  const printCss = `<style>
@media print {
  body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: none; padding: 0; }
  @page { size: A4; margin: 18mm 16mm 22mm 16mm; }
  h2, h3, h4 { page-break-after: avoid; }
  table, .info-card, .comparison-wrapper, .pros-cons, .premium-card, .sig-box { page-break-inside: avoid; }
}
</style>`;

  if (templateHtml.includes("</head>")) {
    templateHtml = templateHtml.replace("</head>", `${printCss}\n</head>`);
  }

  // Render with Nunjucks
  const rendered = env.renderString(templateHtml, {
    ...context,
    generated_at: new Date().toLocaleString("en-NZ", {
      timeZone: "Pacific/Auckland",
      dateStyle: "long",
      timeStyle: "short",
    }),
  });

  return rendered;
}
