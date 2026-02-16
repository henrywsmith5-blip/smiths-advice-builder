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

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Inject <base> tag so /fonts/ paths resolve to the running app
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    let prepared = html.replace("<head>", `<head><base href="${baseUrl}">`);

    // Embed local images as base64 data URIs so Playwright doesn't need HTTP access
    prepared = embedLocalImages(prepared);

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
