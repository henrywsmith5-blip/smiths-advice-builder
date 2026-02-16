import { chromium, type Browser } from "playwright";

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

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Inject <base> tag so /fonts/ paths resolve to the running app
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const htmlWithBase = html.replace("<head>", `<head><base href="${baseUrl}">`);

    await page.setContent(htmlWithBase, { waitUntil: "networkidle" });

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
