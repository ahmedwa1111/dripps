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

    if (order && !error) {
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
      return;
    }

    const { data: pending, error: pendingError } = await supabase
      .from("pending_orders")
      .select("*")
      .eq("id", merchantOrderId)
      .maybeSingle();

    if (pendingError || !pending) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const orderPayload: Record<string, any> = {
      id: pending.id,
      user_id: pending.user_id,
      status: "pending",
      payment_method: "card",
      payment_status: "paid",
      transaction_id: transactionId ?? null,
      paid_at: new Date().toISOString(),
      subtotal: Number(pending.subtotal || 0),
      shipping_cost: Number(pending.shipping_cost || 0),
      total: Number(pending.total || 0),
      total_amount_cents:
        Number(pending.total_amount_cents || 0) ||
        (amountCents ? Number(amountCents) : 0),
      shipping_address: pending.shipping_address,
      billing_address: pending.billing_address ?? pending.shipping_address,
      customer_email: pending.customer_email,
      customer_name: pending.customer_name,
      notes: pending.notes ?? null,
    };

    const { data: createdOrder, error: insertError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .maybeSingle();

    if (insertError) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("id", merchantOrderId)
        .maybeSingle();

      if (!existingOrder) {
        res.status(500).json({ error: "Failed to create order after payment" });
        return;
      }
    }

    const orderItems = Array.isArray(pending.order_items) ? pending.order_items : [];
    if (orderItems.length > 0) {
      const itemsPayload = orderItems.map((item: any) => ({
        order_id: pending.id,
        product_id: item.product_id ?? null,
        product_name: item.product_name ?? "Item",
        product_image: item.product_image ?? null,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        total_price: Number(item.total_price || 0),
      }));

      await supabase.from("order_items").insert(itemsPayload);
    }

    await supabase
      .from("pending_orders")
      .update({ status: "consumed", consumed_at: new Date().toISOString() })
      .eq("id", pending.id);

    res.status(200).json({ ok: true, orderId: pending.id });
  } catch (updateErr) {
    console.error("Paymob webhook update failed:", updateErr);
    res.status(500).json({ error: "Failed to process webhook" });
  }
}
