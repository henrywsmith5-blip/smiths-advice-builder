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

// Pre-build a cache of all images under public/images as base64 data URIs.
// This runs once when the module is first imported, so the files only need
// to be readable at server startup, not at PDF-generation time.
const imageCache: Record<string, string> = {};

function buildImageCache(): void {
  const candidates = [
    path.join(process.cwd(), "public"),
    "/app/public",
    path.resolve(process.cwd(), "..", "public"),
    path.resolve(__dirname, "../../public"),
    path.resolve(__dirname, "../../../public"),
    path.resolve(__dirname, "../../../../public"),
    path.resolve(__dirname, "../../../../../public"),
  ];

  let publicDir: string | null = null;
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, "images"))) {
        publicDir = dir;
        break;
      }
    } catch { /* ignore */ }
  }

  if (!publicDir) {
    console.error("[PDF] Could not find public/images dir. Tried:", candidates);
    return;
  }
  console.log("[PDF] Found public dir at:", publicDir);

  function scanDir(dir: string, prefix: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = path.join(dir, entry.name);
        const relKey = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scanDir(fullPath, relKey);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          const mime = MIME[ext];
          if (mime) {
            try {
              const b64 = fs.readFileSync(fullPath).toString("base64");
              const urlKey = `/images/${relKey}`;
              imageCache[urlKey] = `data:${mime};base64,${b64}`;
            } catch (e) {
              console.error("[PDF] Failed to read image:", fullPath, e);
            }
          }
        }
      }
    } catch (e) {
      console.error("[PDF] Failed to scan dir:", dir, e);
    }
  }

  scanDir(path.join(publicDir, "images"), "");
  console.log("[PDF] Cached", Object.keys(imageCache).length, "images:", Object.keys(imageCache));
}

// Build cache at module load time
buildImageCache();

function embedLocalImages(html: string): string {
  if (Object.keys(imageCache).length === 0) {
    console.warn("[PDF] Image cache is empty, images will not be embedded");
    return html;
  }

  return html.replace(
    /(?:url\(\s*['"]?|(?:src|href)\s*=\s*['"])(\/(images\/[^'")}\s]+))/g,
    (fullMatch, urlPath) => {
      const dataUri = imageCache[urlPath];
      if (!dataUri) {
        console.warn("[PDF] Image not in cache:", urlPath);
        return fullMatch;
      }

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
