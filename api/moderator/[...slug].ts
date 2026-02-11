import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireEmployee, requirePermission, listAccountPermissions, listAccountRoles } from "../_lib/rbac.js";

const getSegments = (req: VercelRequest) => {
  const slug = req.query.slug;
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
};

const parseNumber = (value?: string | string[]) => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const handleMe = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requireEmployee(req as any, res as any);
  if (!auth) return;

  const { supabase, account } = auth;
  if (!account) {
    res.status(403).json({ error: "Employee account required" });
    return;
  }

  try {
    const roles = await listAccountRoles(supabase, account.id);
    const permissions = await listAccountPermissions(supabase, account.id);

    res.status(200).json({
      account,
      roles,
      permissions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to load profile" });
  }
};

const handlePayroll = async (req: VercelRequest, res: VercelResponse) => {
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
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = getSegments(req);
  if (segments.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (segments[0] === "me") {
    await handleMe(req, res);
    return;
  }

  if (segments[0] === "payroll") {
    await handlePayroll(req, res);
    return;
  }

  res.status(404).json({ error: "Not found" });
}
