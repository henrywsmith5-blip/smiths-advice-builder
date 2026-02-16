import { chromium, type Browser } from "playwright";
import fs from "fs";
import path from "path";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  browserInstance = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browserInstance;
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function embedLocalImages(html: string): string {
  const publicDir = path.join(process.cwd(), "public");

  return html.replace(
    /(?:url\(\s*['"]?|(?:src|href)\s*=\s*['"])(\/(images\/[^'")}\s]+))/g,
    (fullMatch, urlPath, relPath) => {
      const filePath = path.join(publicDir, relPath);
      if (!fs.existsSync(filePath)) return fullMatch;

      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext];
      if (!mime) return fullMatch;

      const b64 = fs.readFileSync(filePath).toString("base64");
      const dataUri = `data:${mime};base64,${b64}`;

      if (fullMatch.startsWith("url(")) {
        const quote = fullMatch.includes("'") ? "'" : fullMatch.includes('"') ? '"' : "";
        return `url(${quote}${dataUri}`;
      }
      const attr = fullMatch.startsWith("src") ? "src" : "href";
      const quote = fullMatch.includes("'") ? "'" : '"';
      return `${attr}=${quote}${dataUri}`;
    }
  );
}

function preflightValidation(html: string): void {
  const isPartner = html.includes('IS_PARTNER') === false && html.includes('section-block-break') && html.includes('CLIENT_B_NAME');
  const isSingleClient = !html.includes('client-divider"><span>') || 
    (html.match(/client-divider/g) || []).length <= 1;

  if (isSingleClient && /Client\s*B/i.test(html.replace(/<!--[\s\S]*?-->/g, '').replace(/{%[\s\S]*?%}/g, ''))) {
    throw new Error("Preflight: Single-client document contains Client B content. Aborting PDF generation.");
  }

  const premiumSection = html.indexOf('Premium Summary');
  if (premiumSection !== -1) {
    const beforePremium = html.substring(Math.max(0, premiumSection - 200), premiumSection);
    if (!beforePremium.includes('section-block-break')) {
      throw new Error("Preflight: Premium Summary does not start on a new page. Aborting PDF generation.");
    }
  }
}

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Inject <base> tag so /fonts/ paths resolve to the running app
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    let prepared = html.replace("<head>", `<head><base href="${baseUrl}">`);

    // Embed local images as base64 data URIs so Playwright doesn't need HTTP access
    prepared = embedLocalImages(prepared);

    // Preflight: validate pagination structure
    preflightValidation(prepared);

    await page.setContent(prepared, { waitUntil: "networkidle" });

    // Wait for all locally-served fonts to load
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        bottom: "0",
        left: "0",
        right: "0",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

// Graceful shutdown
if (typeof process !== "undefined") {
  const cleanup = async () => {
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
    }
  };
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}
