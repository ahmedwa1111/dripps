import type { VercelRequest, VercelResponse } from "@vercel/node";

const truthy = new Set(["true", "1", "yes", "y"]);
const falsy = new Set(["false", "0", "no", "n"]);

const pickString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const extractFromBody = (body: unknown, key: string): string | undefined => {
  if (!body) return undefined;
  if (typeof body === "string") {
    try {
      const params = new URLSearchParams(body);
      const value = params.get(key);
      return value || undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    const direct = pickString(record[key]);
    if (direct) return direct;
  }
  return undefined;
};

const resolveBaseUrl = (req: VercelRequest): string | undefined => {
  const envBase =
    process.env.APP_BASE_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_API_BASE_URL;
  if (envBase) return envBase;

  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ||
    (req.headers.host as string | undefined);
  if (!host) return undefined;

  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) || "https";
  return `${proto}://${host}`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const baseUrl = resolveBaseUrl(req);

  const getParam = (key: string): string | undefined =>
    pickString(req.query?.[key]) || extractFromBody(req.body, key);

  const successRaw =
    getParam("success") ||
    getParam("is_success") ||
    getParam("isSuccess");

  let success: string | undefined;
  if (successRaw) {
    const normalized = successRaw.toLowerCase();
    if (truthy.has(normalized)) success = "true";
    if (falsy.has(normalized)) success = "false";
  }

  const orderId =
    getParam("merchant_order_id") ||
    getParam("order_id") ||
    getParam("order") ||
    getParam("orderId");

  const transactionId =
    getParam("id") ||
    getParam("transaction_id") ||
    getParam("txn_id");

  if (!baseUrl) {
    res.status(200).json({
      ok: true,
      success,
      order_id: orderId,
      transaction_id: transactionId,
    });
    return;
  }

  const redirectUrl = new URL("/payment-result", baseUrl);
  if (success) redirectUrl.searchParams.set("success", success);
  if (orderId) redirectUrl.searchParams.set("order_id", orderId);
  if (transactionId) redirectUrl.searchParams.set("id", transactionId);

  res.setHeader("Location", redirectUrl.toString());
  res.status(302).end();
}
