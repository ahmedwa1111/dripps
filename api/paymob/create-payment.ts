import type { VercelRequest, VercelResponse } from "@vercel/node";

const PAYMOB_BASE_URL = "https://accept.paymob.com/api";

type CreatePaymentBody = {
  amountCents: number;
  merchantOrderId: string;
  billingData: Record<string, string | number | null>;
  items?: Array<Record<string, string | number>>;
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
    const { amountCents, merchantOrderId, billingData, items } =
      (req.body as CreatePaymentBody) || {};

    if (!amountCents || !merchantOrderId || !billingData) {
      res.status(400).json({ error: "Missing required payment fields" });
      return;
    }

    const apiKey = getEnv("PAYMOB_API_KEY");
    const integrationId = Number(getEnv("PAYMOB_INTEGRATION_ID"));
    const iframeId = getEnv("PAYMOB_IFRAME_ID");

    const auth = await postJson<{ token: string }>(`${PAYMOB_BASE_URL}/auth/tokens`, {
      api_key: apiKey,
    });

    const order = await postJson<{ id: number }>(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
      auth_token: auth.token,
      delivery_needed: "false",
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: merchantOrderId,
      items: items ?? [],
    });

    const paymentKey = await postJson<{ token: string }>(
      `${PAYMOB_BASE_URL}/acceptance/payment_keys`,
      {
        auth_token: auth.token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: order.id,
        billing_data: billingData,
        currency: "EGP",
        integration_id: integrationId,
        lock_order_when_paid: "false",
      }
    );

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey.token}`;

    res.status(200).json({
      iframeUrl,
      paymobOrderId: order.id,
      merchantOrderId,
    });
  } catch (error) {
    console.error("Paymob create-payment failed:", error);
    res.status(500).json({ error: "Failed to create Paymob payment" });
  }
}
