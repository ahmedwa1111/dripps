import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdminClient } from "../_lib/supabase.js";
import { getUserFromRequest } from "../_lib/auth.js";
import { validateCoupon, type CartItemInput } from "../_lib/coupons.js";

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

type CreateOrderBody = {
  orderId?: string;
  customerEmail: string;
  customerName: string;
  notes?: string | null;
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown> | null;
  paymentMethod?: "card" | "cod";
  paymentStatus?: "paid" | "unpaid";
  transactionId?: string | null;
  paidAt?: string | null;
  shippingCost?: number | null;
  items: CartItemInput[];
  couponCode?: string | null;
};

const buildOrderItems = (
  items: CartItemInput[],
  products: Array<{ id: string; name: string; image_url: string | null; price: number }>
) => {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const orderItems: Array<{
    product_id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }> = [];

  let subtotal = 0;

  for (const item of items) {
    const product = item?.product_id ? productMap.get(item.product_id) : null;
    const quantity = Number(item?.quantity || 0);
    if (!product || !Number.isFinite(quantity) || quantity <= 0) continue;
    const unitPrice = Number(product.price || 0);
    const totalPrice = roundCurrency(unitPrice * quantity);
    subtotal += totalPrice;
    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url ?? null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    });
  }

  return { orderItems, subtotal: roundCurrency(subtotal) };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = (req.body || {}) as CreateOrderBody;
    const items = Array.isArray(body.items) ? body.items : [];

    if (!body.customerEmail || !body.customerName || !body.shippingAddress) {
      res.status(400).json({ error: "Missing required order fields" });
      return;
    }

    if (items.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const supabase = getSupabaseAdminClient();
    const { user } = await getUserFromRequest(req);
    const userId = user?.id ?? null;

    if (body.orderId) {
      const { data: existing, error: existingError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", body.orderId)
        .maybeSingle();

      if (existing && !existingError) {
        const updatePayload: Record<string, any> = {};
        if (body.paymentStatus && existing.payment_status !== body.paymentStatus) {
          updatePayload.payment_status = body.paymentStatus;
        }
        if (body.paymentMethod && existing.payment_method !== body.paymentMethod) {
          updatePayload.payment_method = body.paymentMethod;
        }
        if (body.transactionId) {
          updatePayload.transaction_id = body.transactionId;
        }
        if (body.paidAt) {
          updatePayload.paid_at = body.paidAt;
        }

        if (Object.keys(updatePayload).length > 0) {
          await supabase.from("orders").update(updatePayload).eq("id", existing.id);
        }

        if (existing.coupon_id && Number(existing.discount_amount || 0) > 0) {
          const { data: redemption } = await supabase
            .from("coupon_redemptions")
            .select("id")
            .eq("coupon_id", existing.coupon_id)
            .eq("order_id", existing.id)
            .maybeSingle();

          if (!redemption) {
            await supabase.from("coupon_redemptions").insert({
              coupon_id: existing.coupon_id,
              order_id: existing.id,
              user_id: existing.user_id ?? null,
              discount_amount: Number(existing.discount_amount || 0),
            });
          }
        }

        res.status(200).json(existing);
        return;
      }
    }

    const productIds = Array.from(
      new Set(items.map((item) => item?.product_id).filter((id): id is string => Boolean(id)))
    );

    if (productIds.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, image_url, price")
      .in("id", productIds);

    if (productsError || !products) {
      res.status(500).json({ error: "Failed to load products" });
      return;
    }

    const { orderItems, subtotal } = buildOrderItems(
      items,
      products as Array<{ id: string; name: string; image_url: string | null; price: number }>
    );

    if (orderItems.length === 0 || subtotal <= 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discountAmount = 0;

    if (body.couponCode) {
      const couponResult = await validateCoupon({
        code: body.couponCode,
        items,
        userId,
      });

      if (!couponResult.valid) {
        res.status(400).json({ error: couponResult.reason || "Invalid coupon" });
        return;
      }

      couponId = couponResult.coupon?.id ?? null;
      couponCode = couponResult.coupon?.code ?? null;
      discountAmount = couponResult.discountAmount;
    }

    const shippingCost = Number(body.shippingCost || 0);
    const total = roundCurrency(Math.max(0, subtotal + shippingCost - discountAmount));
    const totalAmountCents = Math.round(total * 100);

    const paymentMethod = body.paymentMethod ?? "card";
    const paymentStatus = body.paymentStatus ?? "unpaid";
    const paidAt =
      body.paidAt ?? (paymentStatus === "paid" ? new Date().toISOString() : null);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        id: body.orderId,
        user_id: userId,
        status: "pending",
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        transaction_id: body.transactionId ?? null,
        paid_at: paidAt,
        subtotal,
        shipping_cost: shippingCost,
        discount_amount: discountAmount,
        coupon_id: couponId,
        coupon_code: couponCode,
        total,
        total_amount_cents: totalAmountCents,
        shipping_address: body.shippingAddress ?? null,
        billing_address: body.billingAddress ?? body.shippingAddress ?? null,
        customer_email: body.customerEmail,
        customer_name: body.customerName,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (orderError || !order) {
      res.status(500).json({ error: "Failed to create order" });
      return;
    }

    const orderItemsPayload = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      res.status(500).json({ error: "Failed to create order items" });
      return;
    }

    // Coupon redemptions are recorded only when an order is created. Card payments
    // create orders after successful payment callbacks, so failed/canceled payments
    // do not consume coupon usage.
    if (couponId && discountAmount > 0) {
      const { error: redemptionError } = await supabase
        .from("coupon_redemptions")
        .insert({
          coupon_id: couponId,
          order_id: order.id,
          user_id: userId,
          discount_amount: discountAmount,
        });

      if (redemptionError && redemptionError.code !== "23505") {
        res.status(500).json({ error: "Failed to redeem coupon" });
        return;
      }
    }

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to create order" });
  }
}
