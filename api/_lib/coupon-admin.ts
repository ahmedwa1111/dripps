import { normalizeCouponCode, type CouponType } from "./coupons.js";

export type CouponPayload = {
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  is_active: boolean;
  apply_to_all: boolean;
  applicable_product_ids: string[] | null;
  applicable_category_ids: string[] | null;
};

const parseNumber = (value: unknown, { allowNull = true }: { allowNull?: boolean } = {}) => {
  if (value === null || value === undefined || value === "") {
    return allowNull ? null : NaN;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseInteger = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.floor(parsed);
};

const parseDateTime = (value: unknown) => {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

export const normalizeCouponPayload = (input: any): {
  payload?: CouponPayload;
  error?: string;
} => {
  const code = normalizeCouponCode(input?.code);
  if (!code) return { error: "Coupon code is required (uppercase, no spaces)." };

  const type = input?.type;
  if (type !== "percentage" && type !== "fixed") {
    return { error: "Invalid coupon type." };
  }

  const value = parseNumber(input?.value, { allowNull: false });
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Coupon value must be greater than 0." };
  }

  if (type === "percentage" && (value <= 0 || value > 100)) {
    return { error: "Percentage coupons must be between 1 and 100." };
  }

  const minOrder = parseNumber(input?.min_order_amount);
  if (minOrder !== null && (!Number.isFinite(minOrder) || minOrder < 0)) {
    return { error: "Minimum order amount must be 0 or more." };
  }

  const maxDiscount = parseNumber(input?.max_discount_amount);
  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) {
    return { error: "Max discount must be 0 or more." };
  }

  const startsAt = parseDateTime(input?.starts_at);
  if (startsAt === undefined) return { error: "Invalid start date." };
  const expiresAt = parseDateTime(input?.expires_at);
  if (expiresAt === undefined) return { error: "Invalid expiry date." };

  if (startsAt && expiresAt && new Date(startsAt) > new Date(expiresAt)) {
    return { error: "Start date must be before expiry date." };
  }

  const usageLimitTotal = parseInteger(input?.usage_limit_total);
  if (usageLimitTotal !== null && (!Number.isFinite(usageLimitTotal) || usageLimitTotal < 0)) {
    return { error: "Total usage limit must be 0 or more." };
  }

  const usageLimitPerUser = parseInteger(input?.usage_limit_per_user);
  if (usageLimitPerUser !== null && (!Number.isFinite(usageLimitPerUser) || usageLimitPerUser < 0)) {
    return { error: "Per-user usage limit must be 0 or more." };
  }

  const applyToAll = Boolean(input?.apply_to_all);
  const productIds = Array.isArray(input?.applicable_product_ids)
    ? input.applicable_product_ids.filter((id: string) => Boolean(id))
    : [];
  const categoryIds = Array.isArray(input?.applicable_category_ids)
    ? input.applicable_category_ids.filter((id: string) => Boolean(id))
    : [];

  if (!applyToAll) {
    if (productIds.length > 0 && categoryIds.length > 0) {
      return { error: "Choose either products or categories (not both)." };
    }
    if (productIds.length === 0 && categoryIds.length === 0) {
      return { error: "Select at least one product or category." };
    }
  }

  return {
    payload: {
      code,
      type,
      value,
      min_order_amount: minOrder,
      max_discount_amount: type === "percentage" ? maxDiscount : null,
      starts_at: startsAt,
      expires_at: expiresAt,
      usage_limit_total: usageLimitTotal,
      usage_limit_per_user: usageLimitPerUser,
      is_active: Boolean(input?.is_active ?? true),
      apply_to_all: applyToAll || (productIds.length === 0 && categoryIds.length === 0),
      applicable_product_ids: applyToAll ? null : productIds.length ? productIds : null,
      applicable_category_ids: applyToAll ? null : categoryIds.length ? categoryIds : null,
    },
  };
};
