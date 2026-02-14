import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getSupabaseAdminClient } from "../_lib/supabase.js";
import {
  buildCartSnapshot,
  evaluateCouponRules,
  getUserRedemptionCount,
  loadCouponByCode,
  normalizeCouponCode,
  type CartItemInput,
} from "../_lib/coupons.js";
import { getUserFromRequest } from "../_lib/auth.js";

const PAYMOB_BASE_URL = "https://accept.paymob.com/api";

type CreatePaymentBody = {
  merchantOrderId?: string;
  billingData: Record<string, string | number | null>;
  items: CartItemInput[];
  shippingCost?: number | null;
  couponCode?: string | null;
  orderPayload?: {
    userId?: string | null;
    customerEmail: string;
    customerName: string;
    notes?: string | null;
    shippingAddress: Record<string, unknown> | null;
    billingAddress?: Record<string, unknown> | null;
  };
};

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const postJson = async <T>(url: string, payload: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Paymob request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { merchantOrderId, billingData, items, shippingCost, couponCode, orderPayload } =
      (req.body as CreatePaymentBody) || {};

    if (!billingData || !Array.isArray(items) || items.length === 0 || !orderPayload) {
      res.status(400).json({ error: "Missing required payment fields" });
      return;
    }

    const apiKey = getEnv("PAYMOB_API_KEY");
    const integrationId = Number(getEnv("PAYMOB_INTEGRATION_ID"));
    const iframeId = getEnv("PAYMOB_IFRAME_ID");

    const auth = await postJson<{ token: string }>(`${PAYMOB_BASE_URL}/auth/tokens`, {
      api_key: apiKey,
    });

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const canPersistPending = Boolean(supabaseUrl && serviceKey && orderPayload);

    const pendingId = merchantOrderId || crypto.randomUUID();
    const supabase = getSupabaseAdminClient();

    const productIds = Array.from(
      new Set(items.map((item) => item?.product_id).filter((id): id is string => Boolean(id)))
    );

    if (productIds.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, image_url, price, category_id")
      .in("id", productIds);

    if (productsError || !products) {
      res.status(500).json({ error: "Failed to load products" });
      return;
    }

    const cartSnapshot = buildCartSnapshot(
      items,
      products as Array<{ id: string; price: number; category_id: string | null }>
    );

    if (!cartSnapshot.items.length || cartSnapshot.subtotal <= 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const { user } = await getUserFromRequest(req);
    const userId = user?.id ?? null;

    let discountAmount = 0;
    let couponId: string | null = null;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const normalized = normalizeCouponCode(couponCode);
      if (!normalized) {
        res.status(400).json({ error: "Invalid coupon code" });
        return;
      }

      const coupon = await loadCouponByCode(supabase, normalized);
      if (!coupon) {
        res.status(400).json({ error: "Coupon not found" });
        return;
      }

      const userRedemptions = userId
        ? await getUserRedemptionCount(supabase, coupon.id, userId)
        : 0;

      const evaluation = evaluateCouponRules({
        coupon,
        items: cartSnapshot.items,
        subtotal: cartSnapshot.subtotal,
        userRedemptions,
        hasUser: Boolean(userId),
      });

      if (!evaluation.valid) {
        res.status(400).json({ error: evaluation.reason || "Invalid coupon" });
        return;
      }

      discountAmount = evaluation.discountAmount;
      couponId = coupon.id;
      appliedCouponCode = coupon.code;
    }

    const shipping = Number(shippingCost || 0);
    const total = Math.max(0, cartSnapshot.subtotal + shipping - discountAmount);
    const totalAmountCents = Math.round(total * 100);

    const productMap = new Map(products.map((product) => [product.id, product]));

    const orderItems = cartSnapshot.items.map((item) => {
      const product = productMap.get(item.product_id);
      const unitPrice = Number(product?.price || 0);
      const totalPrice = unitPrice * item.quantity;
      return {
        product_id: item.product_id,
        product_name: product?.name ?? "Item",
        product_image: product?.image_url ?? null,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
    });

    const paymobItems = orderItems.map((item) => ({
      name: item.product_name,
      amount_cents: String(Math.round(item.unit_price * 100)),
      description: item.product_name,
      quantity: item.quantity,
    }));

    if (canPersistPending) {
      const { error: pendingError } = await supabase.from("pending_orders").insert({
        id: pendingId,
        status: "pending",
        user_id: userId ?? null,
        customer_email: orderPayload.customerEmail,
        customer_name: orderPayload.customerName,
        notes: orderPayload.notes ?? null,
        shipping_address: orderPayload.shippingAddress ?? null,
        billing_address: orderPayload.billingAddress ?? orderPayload.shippingAddress ?? null,
        subtotal: cartSnapshot.subtotal,
        shipping_cost: shipping,
        discount_amount: discountAmount,
        coupon_id: couponId,
        coupon_code: appliedCouponCode,
        total,
        total_amount_cents: totalAmountCents,
        currency: "EGP",
        payment_method: "card",
        order_items: orderItems ?? [],
      });

      if (pendingError) {
        res.status(500).json({ error: "Failed to prepare payment order" });
        return;
      }
    }

    const order = await postJson<{ id: number }>(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
      auth_token: auth.token,
      delivery_needed: "false",
      amount_cents: totalAmountCents,
      currency: "EGP",
      merchant_order_id: pendingId,
      items: paymobItems,
    });

    const paymentKey = await postJson<{ token: string }>(
      `${PAYMOB_BASE_URL}/acceptance/payment_keys`,
      {
        auth_token: auth.token,
        amount_cents: totalAmountCents,
        expiration: 3600,
        order_id: order.id,
        billing_data: billingData,
        currency: "EGP",
        integration_id: integrationId,
        lock_order_when_paid: "false",
      }
    );

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey.token}`;

    if (canPersistPending) {
      await supabase
        .from("pending_orders")
        .update({ paymob_order_id: order.id, updated_at: new Date().toISOString() })
        .eq("id", pendingId);
    }

    res.status(200).json({
      iframeUrl,
      paymobOrderId: order.id,
      merchantOrderId: pendingId,
      totals: {
        subtotal: cartSnapshot.subtotal,
        shipping,
        discount: discountAmount,
        total,
        totalAmountCents,
      },
    });
  } catch (error) {
    console.error("Paymob create-payment failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to create Paymob payment";
    res.status(500).json({ error: message });
  }
}
