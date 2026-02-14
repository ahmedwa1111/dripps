import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateCoupon, type CartItemInput } from "../_lib/coupons.js";
import { getUserFromRequest } from "../_lib/auth.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (req: VercelRequest) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) return realIp;
  return req.socket?.remoteAddress || "unknown";
};

const isRateLimited = (key: string) => {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (existing.count >= RATE_LIMIT_MAX) {
    return true;
  }
  existing.count += 1;
  return false;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ipKey = getClientIp(req);
  if (isRateLimited(ipKey)) {
    res.status(429).json({ error: "Too many attempts. Please try again shortly." });
    return;
  }

  try {
    const body = (req.body || {}) as { code?: string; items?: CartItemInput[] };
    const items = Array.isArray(body.items) ? body.items : [];
    const { user } = await getUserFromRequest(req);

    const result = await validateCoupon({
      code: body.code,
      items,
      userId: user?.id ?? null,
    });

    if (!result.valid) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to apply coupon" });
  }
}
