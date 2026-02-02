import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format price in Egyptian Pounds (L.E.) */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L.E.`;
}

/** Minimum order amount for fast shipping to be included (L.E.) */
export const FAST_SHIPPING_THRESHOLD = 3000;

/** Shipping cost when below threshold (L.E.) */
export const SHIPPING_COST = 299;

/** Item count above which shipping is doubled (e.g. 6+ items = 2× shipping) */
export const SHIPPING_DOUBLE_ITEMS_THRESHOLD = 5;
