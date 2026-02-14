import { getSupabaseAdminClient } from "./supabase.js";

export type CouponType = "percentage" | "fixed";

export type CouponRow = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  used_count: number;
  is_active: boolean;
  apply_to_all: boolean;
  applicable_product_ids: string[] | null;
  applicable_category_ids: string[] | null;
  deleted_at?: string | null;
};

export type CartItemInput = {
  product_id: string;
  quantity: number;
};

export type CartSnapshotItem = {
  product_id: string;
  quantity: number;
  price: number;
  category_id: string | null;
};

export type CouponInvalidReason =
  | "invalid_code"
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "min_order"
  | "usage_limit_total"
  | "usage_limit_user"
  | "signin_required"
  | "not_eligible"
  | "empty_cart";

export type CouponEvaluationResult = {
  valid: boolean;
  reasonCode?: CouponInvalidReason;
  reason?: string;
  discountAmount: number;
  eligibleSubtotal: number;
  subtotal: number;
};

export type CouponValidationResult = CouponEvaluationResult & {
  coupon?: CouponRow;
  normalizedCode?: string;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const formatCurrency = (amount: number): string =>
  `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L.E.`;

export const normalizeCouponCode = (code?: string | null) => {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (/\s/.test(trimmed)) return null;
  return trimmed.toUpperCase();
};

export const buildCartSnapshot = (
  items: CartItemInput[],
  products: Array<{ id: string; price: number; category_id: string | null }>
) => {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const snapshotItems: CartSnapshotItem[] = [];

  for (const item of items) {
    if (!item?.product_id) continue;
    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const product = productMap.get(item.product_id);
    if (!product) continue;
    snapshotItems.push({
      product_id: item.product_id,
      quantity,
      price: Number(product.price || 0),
      category_id: product.category_id ?? null,
    });
  }

  const subtotal = roundCurrency(
    snapshotItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  return { items: snapshotItems, subtotal };
};

const buildReasonMessage = (
  reasonCode: CouponInvalidReason,
  coupon?: CouponRow
): string => {
  switch (reasonCode) {
    case "invalid_code":
      return "Enter a valid coupon code.";
    case "not_found":
      return "Coupon not found.";
    case "inactive":
      return "This coupon is inactive.";
    case "not_started":
      return "This coupon is not active yet.";
    case "expired":
      return "This coupon has expired.";
    case "min_order":
      if (coupon?.min_order_amount != null) {
        return `Spend at least ${formatCurrency(Number(coupon.min_order_amount))} to use this coupon.`;
      }
      return "Cart total does not meet the minimum for this coupon.";
    case "usage_limit_total":
      return "This coupon has reached its usage limit.";
    case "usage_limit_user":
      return "You have already used this coupon.";
    case "signin_required":
      return "Sign in to use this coupon.";
    case "not_eligible":
      return "This coupon does not apply to items in your cart.";
    case "empty_cart":
      return "Your cart is empty.";
    default:
      return "Coupon is invalid.";
  }
};

export const evaluateCouponRules = (params: {
  coupon: CouponRow;
  items: CartSnapshotItem[];
  subtotal: number;
  userRedemptions: number;
  hasUser: boolean;
  now?: Date;
}): CouponEvaluationResult => {
  const { coupon, items, subtotal, userRedemptions, hasUser } = params;
  const now = params.now ?? new Date();

  if (!items.length || subtotal <= 0) {
    const reasonCode: CouponInvalidReason = "empty_cart";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal,
    };
  }

  if (!coupon.is_active) {
    const reasonCode: CouponInvalidReason = "inactive";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal,
    };
  }

  if (coupon.starts_at && now < new Date(coupon.starts_at)) {
    const reasonCode: CouponInvalidReason = "not_started";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal,
    };
  }

  if (coupon.expires_at && now > new Date(coupon.expires_at)) {
    const reasonCode: CouponInvalidReason = "expired";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal,
    };
  }

  if (coupon.min_order_amount != null && subtotal < Number(coupon.min_order_amount)) {
    const reasonCode: CouponInvalidReason = "min_order";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal,
    };
  }

  if (coupon.usage_limit_total != null && coupon.used_count >= coupon.usage_limit_total) {
    const reasonCode: CouponInvalidReason = "usage_limit_total";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal,
    };
  }

  if (coupon.usage_limit_per_user != null) {
    if (!hasUser) {
      const reasonCode: CouponInvalidReason = "signin_required";
      return {
        valid: false,
        reasonCode,
        reason: buildReasonMessage(reasonCode, coupon),
        discountAmount: 0,
        eligibleSubtotal: 0,
        subtotal,
      };
    }

    if (userRedemptions >= coupon.usage_limit_per_user) {
      const reasonCode: CouponInvalidReason = "usage_limit_user";
      return {
        valid: false,
        reasonCode,
        reason: buildReasonMessage(reasonCode, coupon),
        discountAmount: 0,
        eligibleSubtotal: 0,
        subtotal,
      };
    }
  }

  const productIds = coupon.applicable_product_ids ?? [];
  const categoryIds = coupon.applicable_category_ids ?? [];
  const applyToAll = coupon.apply_to_all || (!productIds.length && !categoryIds.length);

  const eligibleItems = applyToAll
    ? items
    : productIds.length
    ? items.filter((item) => productIds.includes(item.product_id))
    : categoryIds.length
    ? items.filter((item) => item.category_id && categoryIds.includes(item.category_id))
    : items;

  const eligibleSubtotal = roundCurrency(
    eligibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  if (eligibleSubtotal <= 0) {
    const reasonCode: CouponInvalidReason = "not_eligible";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal,
    };
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = (eligibleSubtotal * Number(coupon.value)) / 100;
    if (coupon.max_discount_amount != null) {
      discount = Math.min(discount, Number(coupon.max_discount_amount));
    }
  } else {
    discount = Number(coupon.value);
  }

  discount = Math.min(discount, eligibleSubtotal);
  discount = roundCurrency(Math.max(0, discount));

  return {
    valid: true,
    discountAmount: discount,
    eligibleSubtotal,
    subtotal,
  };
};

export const loadCouponByCode = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  normalizedCode: string
) => {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalizedCode)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return null;
  return data as CouponRow | null;
};

export const getUserRedemptionCount = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  couponId: string,
  userId: string
) => {
  const { count, error } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId)
    .eq("user_id", userId);

  if (error) return 0;
  return count ?? 0;
};

export const validateCoupon = async (params: {
  code: string | null | undefined;
  items: CartItemInput[];
  userId?: string | null;
  now?: Date;
}): Promise<CouponValidationResult> => {
  const normalized = normalizeCouponCode(params.code);
  if (!normalized) {
    const reasonCode: CouponInvalidReason = "invalid_code";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal: 0,
    };
  }

  if (!Array.isArray(params.items) || params.items.length === 0) {
    const reasonCode: CouponInvalidReason = "empty_cart";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal: 0,
      normalizedCode: normalized,
    };
  }

  const supabase = getSupabaseAdminClient();
  const coupon = await loadCouponByCode(supabase, normalized);

  if (!coupon) {
    const reasonCode: CouponInvalidReason = "not_found";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal: 0,
      normalizedCode: normalized,
    };
  }

  const productIds = Array.from(
    new Set(
      params.items
        .map((item) => item?.product_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (productIds.length === 0) {
    const reasonCode: CouponInvalidReason = "empty_cart";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal: 0,
      normalizedCode: normalized,
      coupon,
    };
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price, category_id")
    .in("id", productIds);

  if (productsError || !products) {
    const reasonCode: CouponInvalidReason = "empty_cart";
    return {
      valid: false,
      reasonCode,
      reason: buildReasonMessage(reasonCode, coupon),
      discountAmount: 0,
      eligibleSubtotal: 0,
      subtotal: 0,
      normalizedCode: normalized,
      coupon,
    };
  }

  const cartSnapshot = buildCartSnapshot(
    params.items,
    products as Array<{ id: string; price: number; category_id: string | null }>
  );

  const hasUser = Boolean(params.userId);
  const userRedemptions = params.userId
    ? await getUserRedemptionCount(supabase, coupon.id, params.userId)
    : 0;

  const evaluation = evaluateCouponRules({
    coupon,
    items: cartSnapshot.items,
    subtotal: cartSnapshot.subtotal,
    userRedemptions,
    hasUser,
    now: params.now,
  });

  if (!evaluation.valid) {
    return {
      ...evaluation,
      coupon,
      normalizedCode: normalized,
    };
  }

  return {
    ...evaluation,
    coupon,
    normalizedCode: normalized,
  };
};
