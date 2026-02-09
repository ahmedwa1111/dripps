import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getSupabaseAdminClient } from "../_lib/supabase";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const obj = (payload.obj || {}) as Record<string, any>;
  const success = obj.success === true || obj.success === "true";
  const pending = obj.pending === true || obj.pending === "true";

  if (!success || pending) {
    res.status(200).json({ ok: true });
    return;
  }

  const merchantOrderId =
    obj?.order?.merchant_order_id ||
    obj?.order?.merchant_order_id?.toString?.() ||
    obj?.merchant_order_id ||
    payload.merchant_order_id;

  if (!merchantOrderId) {
    res.status(400).json({ error: "Missing merchant_order_id" });
    return;
  }

  const transactionId = obj.id ? String(obj.id) : undefined;
  const amountCents = obj.amount_cents ? Number(obj.amount_cents) : undefined;

  try {
    const supabase = getSupabaseAdminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, payment_status, total_amount_cents")
      .eq("id", merchantOrderId)
      .maybeSingle();

    if (error || !order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.payment_status === "paid") {
      res.status(200).json({ ok: true, status: "already_paid" });
      return;
    }

    const updatePayload: Record<string, any> = {
      payment_method: "card",
      payment_status: "paid",
      transaction_id: transactionId ?? null,
      paid_at: new Date().toISOString(),
    };

    if (amountCents && (!order.total_amount_cents || order.total_amount_cents === 0)) {
      updatePayload.total_amount_cents = amountCents;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", merchantOrderId);

    if (updateError) {
      res.status(500).json({ error: "Failed to update order payment" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (updateErr) {
    console.error("Paymob webhook update failed:", updateErr);
    res.status(500).json({ error: "Failed to process webhook" });
  }
}
