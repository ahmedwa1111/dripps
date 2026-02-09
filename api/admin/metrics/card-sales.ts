import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { getSupabaseAdminClient } from "../../_lib/supabase";
import {
  summarizeCardSales,
  toDateKey,
  type CardSalesRow,
} from "../../_lib/metrics/card-sales";

const app = express();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getQueryValue = (value?: string | string[]) => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const parseDateParam = (value?: string) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getAccessToken = (req: express.Request) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || Array.isArray(header)) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const isStaffUser = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string
) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) return false;
  return data.some((row) => row.role === "admin" || row.role === "manager");
};

app.get(["/api/admin/metrics/card-sales", "/admin/metrics/card-sales"], async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }

  const fromParam = getQueryValue(req.query.from as string | string[] | undefined);
  const toParam = getQueryValue(req.query.to as string | string[] | undefined);
  const from = parseDateParam(fromParam);
  const to = parseDateParam(toParam);

  if (!from || !to) {
    res.status(400).json({ error: "Missing or invalid from/to date" });
    return;
  }

  if (from > to) {
    res.status(400).json({ error: "from must be on or before to" });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const staff = await isStaffUser(supabase, userData.user.id);
    if (!staff) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const toExclusive = new Date(to.getTime() + MS_PER_DAY);

    const { data: rows, error: rowsError } = await supabase
      .from("orders")
      .select("total_amount_cents, paid_at")
      .eq("payment_status", "paid")
      .eq("payment_method", "card")
      .gte("paid_at", from.toISOString())
      .lt("paid_at", toExclusive.toISOString());

    if (rowsError) {
      res.status(500).json({ error: "Failed to load card sales" });
      return;
    }

    const summary = summarizeCardSales(from, to, (rows || []) as CardSalesRow[]);

    res.status(200).json({
      from: toDateKey(from),
      to: toDateKey(to),
      totalCardSalesCents: summary.totalCardSalesCents,
      totalCardOrders: summary.totalCardOrders,
      timeseries: summary.timeseries,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to load card sales" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}

export { app as cardSalesApp };
