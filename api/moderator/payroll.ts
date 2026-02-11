import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../_lib/rbac.js";

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

  const auth = await requirePermission(req as any, res as any, "payroll.read");
  if (!auth) return;

  const year = parseNumber(req.query.year as any);
  const month = parseNumber(req.query.month as any);

  const { supabase, user } = auth;

  const { data: account, error: accountError } = await supabase
    .from("employee_accounts")
    .select("employee_id")
    .eq("id", user.id)
    .maybeSingle();

  if (accountError || !account) {
    res.status(403).json({ error: "Employee account required" });
    return;
  }

  let query = supabase
    .from("payroll_records")
    .select("id, employee_id, period_year, period_month, salary_cents, status, paid_at, payment_method, notes, created_at, updated_at")
    .eq("employee_id", account.employee_id)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  if (year) query = query.eq("period_year", year);
  if (month) query = query.eq("period_month", month);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: "Failed to load payroll records" });
    return;
  }

  res.status(200).json({ payroll: data || [] });
}
