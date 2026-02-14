import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { getSupabaseAdminClient } from "../../_lib/supabase.js";
import { resolveLogoDataUrl } from "../../_lib/assets.js";
import { renderInvoicePdf } from "../../_lib/invoice-pdf.js";
import type { InvoiceTemplateData } from "../../_lib/invoice-template.js";

type Address = {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
};

type OrderRow = {
  id: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount?: number;
  coupon_code?: string | null;
  total: number;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: Address | null;
  created_at: string;
  user_id: string | null;
};

type OrderItemRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

const app = express();

const isTruthy = (value?: unknown) => {
  if (value === undefined || value === null) return false;
  const normalized = Array.isArray(value) ? value[0] : value;
  if (typeof normalized !== "string") return false;
  return ["1", "true", "yes"].includes(normalized.toLowerCase());
};

const getOrderIdFromRequest = (req: express.Request) => {
  const paramId = req.params?.id;
  if (paramId) return paramId;
  const queryId = req.query?.id;
  if (typeof queryId === "string") return queryId;
  if (Array.isArray(queryId)) return queryId[0];
  // Fallback: parse from URL path segments.
  const segments = req.path.split("/").filter(Boolean);
  return segments[segments.length - 2];
};

const buildBaseUrl = (req: express.Request) => {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const proto =
    (req.headers["x-forwarded-proto"] as string) ||
    (req.protocol || "https");
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers.host as string);
  if (!host) return "";
  return `${proto}://${host}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const buildAddressLines = (address: Address | null): string[] => {
  if (!address) return ["Not provided"];
  const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ");
  const lines = [
    fullName || undefined,
    address.address1,
    address.address2,
    [address.city, address.state, address.zip].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean) as string[];
  return lines.length > 0 ? lines : ["Not provided"];
};

const getAccessToken = (req: express.Request) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || Array.isArray(header)) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const isStaffUser = async (supabase: ReturnType<typeof getSupabaseAdminClient>, userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) return false;
  return data.some((row) => row.role === "admin" || row.role === "manager");
};

const assertInvoiceAccess = async (
  req: express.Request,
  order: OrderRow
) => {
  if (process.env.INVOICE_PUBLIC_ACCESS === "true") return;

  const token = getAccessToken(req);
  if (!token) {
    const error = new Error("Missing authorization token.");
    (error as any).status = 401;
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    const authError = new Error("Invalid or expired token.");
    (authError as any).status = 401;
    throw authError;
  }

  const userId = data.user.id;
  if (order.user_id && order.user_id === userId) return;

  const staff = await isStaffUser(supabase, userId);
  if (!staff) {
    const forbidden = new Error("Not authorized to access this invoice.");
    (forbidden as any).status = 403;
    throw forbidden;
  }
};

const sendInvoiceEmail = async (payload: {
  pdfBuffer: Buffer;
  order: OrderRow;
  orderUrl: string;
}) => {
  if (process.env.INVOICE_EMAIL_ENABLED !== "true") return;
  const { order, pdfBuffer, orderUrl } = payload;
  if (!order.customer_email) return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "Drippss <no-reply@drippss.com>";

  if (!host || !user || !pass) return;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: order.customer_email,
    subject: `Your Drippss invoice for order #${order.id.slice(0, 8).toUpperCase()}`,
    text: `Thanks for shopping with Drippss. Your invoice is attached. View your order: ${orderUrl}`,
    html: `<p>Thanks for shopping with Drippss.</p><p>Your invoice is attached.</p><p><a href="${orderUrl}">View your order</a></p>`,
    attachments: [
      {
        filename: `drippss-invoice-${order.id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
};

app.get(["/api/orders/:id/invoice", "/:id/invoice"], async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const orderId = getOrderIdFromRequest(req);
    if (!orderId) {
      res.status(400).json({ error: "Missing order id" });
      return;
    }

    // 1) Fetch order + items from Supabase using the service role key.
    const supabase = getSupabaseAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsError) {
      res.status(500).json({ error: "Failed to load order items" });
      return;
    }

    // 2) Authorize access (unless public access is explicitly enabled).
    await assertInvoiceAccess(req, order as OrderRow);

    // 3) Build assets (order URL, QR code, logo) and template payload.
    const baseUrl = buildBaseUrl(req);
    const orderUrl = baseUrl ? `${baseUrl}/order/${orderId}` : `/order/${orderId}`;
    const qrDataUrl = await QRCode.toDataURL(orderUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 180,
      color: {
        dark: "#4c1d95",
        light: "#ffffff",
      },
    });
    const logoDataUrl = await resolveLogoDataUrl(baseUrl);

    const orderRow = order as OrderRow;
    const address = orderRow.shipping_address ?? null;
    const addressLines = buildAddressLines(address);

    const templateData: InvoiceTemplateData = {
      brandName: "Drippss",
      orderId: orderRow.id,
      orderDate: formatDate(orderRow.created_at),
      orderStatus: orderRow.status,
      customerName: orderRow.customer_name || "Guest",
      customerEmail: orderRow.customer_email,
      customerPhone: address?.phone || null,
      shippingAddressLines: addressLines,
      items: (items as OrderItemRow[]).map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
      })),
      subtotal: Number(orderRow.subtotal),
      shippingFee: Number(orderRow.shipping_cost),
      discount: Number(orderRow.discount_amount || 0),
      couponCode: orderRow.coupon_code ?? null,
      total: Number(orderRow.total),
      qrDataUrl,
      orderUrl,
      logoDataUrl,
    };

    // 4) Render the PDF from the HTML template.
    const pdfBuffer = await renderInvoicePdf(templateData);
    const inline = isTruthy(req.query.inline);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="drippss-invoice-${orderRow.id}.pdf"`
    );
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(pdfBuffer);

    // 5) Optionally email the invoice when requested.
    if (isTruthy(req.query.email)) {
      try {
        await sendInvoiceEmail({ pdfBuffer, order: orderRow, orderUrl });
      } catch (emailError) {
        console.error("Invoice email failed:", emailError);
      }
    }
  } catch (error: any) {
    const status = error?.status || 500;
    res.status(status).json({ error: error?.message || "Failed to generate invoice" });
  }
});

// Fallback to avoid hanging responses if the route doesn't match.
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
