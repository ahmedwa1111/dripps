import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { buildInvoiceHtml, type InvoiceTemplateData } from "./invoice-template.js";

const DEFAULT_PDF_OPTIONS = {
  format: "A4" as const,
  printBackground: true,
  margin: {
    top: "24px",
    bottom: "24px",
    left: "24px",
    right: "24px",
  },
};

const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

const resolveExecutablePath = async () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (isServerless) {
    return chromium.executablePath();
  }

  // For local/dev environments, fall back to Puppeteer's default resolution.
  return undefined;
};

// Render the invoice HTML into a printable PDF buffer.
export async function renderInvoicePdf(
  data: InvoiceTemplateData
): Promise<Buffer> {
  const html = buildInvoiceHtml(data);
  const executablePath = await resolveExecutablePath();
  const browser = await puppeteer.launch({
    args: isServerless ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: isServerless ? chromium.defaultViewport : undefined,
    executablePath,
    headless: isServerless ? chromium.headless : true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");
    const pdfBuffer = await page.pdf(DEFAULT_PDF_OPTIONS);
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
