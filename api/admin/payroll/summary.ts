import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../_lib/rbac.js";

const parseNumber = (value?: string | string[]) => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requirePermission(req as any, res as any, "payroll.manage");
  if (!auth) return;

  const year = parseNumber(req.query.year as any);
  const month = parseNumber(req.query.month as any);

  const { supabase } = auth;

  let query = supabase
    .from("payroll_records")
    .select("salary_cents, status");

  if (year) query = query.eq("period_year", year);
  if (month) query = query.eq("period_month", month);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: "Failed to load payroll summary" });
    return;
  }

  const summary = {
    totalEmployees: 0,
    totalPayrollCents: 0,
    totalPaidCents: 0,
    totalUnpaidCents: 0,
    paidCount: 0,
    unpaidCount: 0,
  };

  (data || []).forEach((row) => {
    summary.totalEmployees += 1;
    summary.totalPayrollCents += row.salary_cents;
    if (row.status === "paid") {
      summary.totalPaidCents += row.salary_cents;
      summary.paidCount += 1;
    } else {
      summary.totalUnpaidCents += row.salary_cents;
      summary.unpaidCount += 1;
    }
  });

  res.status(200).json({ summary });
}
