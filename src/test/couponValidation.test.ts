import { describe, it, expect } from 'vitest';
import { evaluateCouponRules, type CouponRow } from '../../api/_lib/coupons';

const baseCoupon: CouponRow = {
  id: 'coupon-1',
  code: 'SAVE10',
  type: 'percentage',
  value: 10,
  min_order_amount: null,
  max_discount_amount: null,
  starts_at: null,
  expires_at: null,
  usage_limit_total: null,
  usage_limit_per_user: null,
  used_count: 0,
  is_active: true,
  apply_to_all: true,
  applicable_product_ids: null,
  applicable_category_ids: null,
};

const cartItems = [
  { product_id: 'p1', quantity: 2, price: 100, category_id: 'c1' },
  { product_id: 'p2', quantity: 1, price: 200, category_id: 'c2' },
];

const subtotal = 400;

describe('coupon validation rules', () => {
  it('rejects expired coupons', () => {
    const result = evaluateCouponRules({
      coupon: { ...baseCoupon, expires_at: '2026-01-01T00:00:00.000Z' },
      items: cartItems,
      subtotal,
      userRedemptions: 0,
      hasUser: true,
      now: new Date('2026-02-01T00:00:00.000Z'),
    });

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('expired');
  });

  it('enforces minimum order amount', () => {
    const result = evaluateCouponRules({
      coupon: { ...baseCoupon, min_order_amount: 500 },
      items: cartItems,
      subtotal,
      userRedemptions: 0,
      hasUser: true,
    });

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('min_order');
  });

  it('enforces total usage limits', () => {
    const result = evaluateCouponRules({
      coupon: { ...baseCoupon, usage_limit_total: 3, used_count: 3 },
      items: cartItems,
      subtotal,
      userRedemptions: 0,
      hasUser: true,
    });

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('usage_limit_total');
  });

  it('enforces per-user usage limits', () => {
    const result = evaluateCouponRules({
      coupon: { ...baseCoupon, usage_limit_per_user: 1 },
      items: cartItems,
      subtotal,
      userRedemptions: 1,
      hasUser: true,
    });

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('usage_limit_user');
  });

  it('caps percentage discounts by max discount amount', () => {
    const result = evaluateCouponRules({
      coupon: { ...baseCoupon, value: 20, max_discount_amount: 50 },
      items: cartItems,
      subtotal,
      userRedemptions: 0,
      hasUser: true,
    });

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(50);
  });

  it('rejects coupons that do not apply to cart items', () => {
    const result = evaluateCouponRules({
      coupon: {
        ...baseCoupon,
        apply_to_all: false,
        applicable_product_ids: ['missing-product'],
      },
      items: cartItems,
      subtotal,
      userRedemptions: 0,
      hasUser: true,
    });

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe('not_eligible');
  });
});
