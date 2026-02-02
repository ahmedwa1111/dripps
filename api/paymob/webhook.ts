import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const DEFAULT_HMAC_FIELD_ORDER = [
  // Adjust this list to match Paymob's exact transaction processed callback field order.
  "obj.amount_cents",
  "obj.created_at",
  "obj.currency",
  "obj.error_occured",
  "obj.has_parent_transaction",
  "obj.id",
  "obj.integration_id",
  "obj.is_3d_secure",
  "obj.is_auth",
  "obj.is_capture",
  "obj.is_refunded",
  "obj.is_standalone_payment",
  "obj.is_voided",
  "obj.order.id",
  "obj.owner",
  "obj.pending",
  "obj.source_data.pan",
  "obj.source_data.sub_type",
  "obj.source_data.type",
  "obj.success",
];

const getValueByPath = (payload: Record<string, unknown>, path: string): string => {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, payload);

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const buildHmacString = (payload: Record<string, unknown>, fieldOrder: string[]): string =>
  fieldOrder.map((field) => getValueByPath(payload, field)).join("");

const getHmacFromRequest = (req: VercelRequest): string | undefined => {
  const queryHmac = req.query?.hmac;
  if (typeof queryHmac === "string" && queryHmac) {
    return queryHmac;
  }

  const headerHmac = req.headers?.hmac;
  if (typeof headerHmac === "string" && headerHmac) {
    return headerHmac;
  }

  const bodyHmac = (req.body as Record<string, unknown> | undefined)?.hmac;
  if (typeof bodyHmac === "string" && bodyHmac) {
    return bodyHmac;
  }

  return undefined;
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const payload = (req.body as Record<string, unknown>) || {};
  const secret = process.env.PAYMOB_HMAC_SECRET;
  const receivedHmac = getHmacFromRequest(req);

  if (secret) {
    if (!receivedHmac) {
      res.status(401).json({ error: "Missing HMAC" });
      return;
    }

    const dataToSign = buildHmacString(payload, DEFAULT_HMAC_FIELD_ORDER);
    const computedHmac = crypto
      .createHmac("sha512", secret)
      .update(dataToSign)
      .digest("hex");

    if (computedHmac.toLowerCase() !== receivedHmac.toLowerCase()) {
      res.status(401).json({ error: "Invalid HMAC" });
      return;
    }
  }

  console.log("Paymob webhook payload:", JSON.stringify(payload));
  res.status(200).json({ ok: true });
}
