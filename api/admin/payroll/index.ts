import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../_lib/rbac.js";

const parseNumber = (value?: string | string[]) => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseString = (value?: string | string[]) => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
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
  const status = parseString(req.query.status as any);
  const q = parseString(req.query.q as any);

  const { supabase } = auth;

  try {
    let employeeFilterIds: string[] | null = null;
    if (q) {
      const { data: matches, error: matchError } = await supabase
        .from("employees")
        .select("id")
        .or(`full_name.ilike.%${q}%,job_title.ilike.%${q}%`);

      if (matchError) {
        res.status(500).json({ error: "Failed to filter employees" });
        return;
      }

      employeeFilterIds = (matches || []).map((row) => row.id);
      if (employeeFilterIds.length === 0) {
        res.status(200).json({ payroll: [] });
        return;
      }
    }

    let query = supabase
      .from("payroll_records")
      .select(
        "id, employee_id, period_year, period_month, salary_cents, status, paid_at, payment_method, notes, created_at, updated_at, employee:employees(id, full_name, job_title, base_salary_cents, is_active)"
      )
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });

    if (year) query = query.eq("period_year", year);
    if (month) query = query.eq("period_month", month);
    if (status) query = query.eq("status", status);
    if (employeeFilterIds) query = query.in("employee_id", employeeFilterIds);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "Failed to load payroll records" });
      return;
    }

    res.status(200).json({ payroll: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to load payroll" });
  }
}
