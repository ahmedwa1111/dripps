import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format price in Egyptian Pounds (L.E.) */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L.E.`;
}

/** Minimum order amount for free shipping (L.E.) */
export const FAST_SHIPPING_THRESHOLD = 1500;

/** Shipping cost when below threshold (L.E.) */
export const SHIPPING_COST = 200;

/** Maximum shipping fee (L.E.) */
export const MAX_SHIPPING_COST = 200;

export const FREE_SHIPPING_STORAGE_KEY = 'drippss_free_shipping_threshold';

export function getFreeShippingThreshold(): number {
  if (typeof window === 'undefined') return FAST_SHIPPING_THRESHOLD;
  const stored = window.localStorage.getItem(FREE_SHIPPING_STORAGE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return FAST_SHIPPING_THRESHOLD;
  }
  return parsed;
}

export function setFreeShippingThreshold(value: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FREE_SHIPPING_STORAGE_KEY, String(value));
  window.dispatchEvent(new CustomEvent('free-shipping-threshold-updated', { detail: value }));
}

/** Item count above which shipping is doubled (e.g. 6+ items = 2x shipping) */
export const SHIPPING_DOUBLE_ITEMS_THRESHOLD = 5;
