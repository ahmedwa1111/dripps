import fs from "fs/promises";
import path from "path";

const tryReadFile = async (filePath: string) => {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
};

const bufferToDataUrl = (buffer: Buffer, mimeType: string) =>
  `data:${mimeType};base64,${buffer.toString("base64")}`;

// Resolve logo image into a data URL for PDF embedding.
export async function resolveLogoDataUrl(baseUrl?: string): Promise<string | null> {
  if (process.env.INVOICE_LOGO_DATA_URL) {
    return process.env.INVOICE_LOGO_DATA_URL;
  }

  const localPaths = [
    path.join(process.cwd(), "public", "logo.png"),
    path.join(process.cwd(), "src", "assets", "logo.png"),
  ];

  for (const logoPath of localPaths) {
    const buffer = await tryReadFile(logoPath);
    if (buffer) {
      return bufferToDataUrl(buffer, "image/png");
    }
  }

  const logoUrl = process.env.INVOICE_LOGO_URL || (baseUrl ? `${baseUrl}/logo.png` : null);
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return bufferToDataUrl(Buffer.from(arrayBuffer), "image/png");
  } catch {
    return null;
  }
}
