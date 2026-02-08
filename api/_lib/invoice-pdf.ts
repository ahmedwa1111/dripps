import puppeteer from "puppeteer";
import { buildInvoiceHtml, type InvoiceTemplateData } from "./invoice-template";

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

const resolveExecutablePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

// Render the invoice HTML into a printable PDF buffer.
export async function renderInvoicePdf(
  data: InvoiceTemplateData
): Promise<Buffer> {
  const html = buildInvoiceHtml(data);
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new",
    executablePath: resolveExecutablePath(),
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
