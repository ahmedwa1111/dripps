import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../_lib/rbac.js";

const generateSchema = z.object({
  year: z.number().int().min(2000),
  month: z.number().int().min(1).max(12),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requirePermission(req as any, res as any, "payroll.manage");
  if (!auth) return;

  const parsed = generateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { year, month } = parsed.data;
  const { supabase } = auth;

  try {
    const { data: employees, error } = await supabase
      .from("employees")
      .select("id, base_salary_cents")
      .eq("is_active", true);

    if (error) {
      res.status(500).json({ error: "Failed to load employees" });
      return;
    }

    if (!employees || employees.length === 0) {
      res.status(200).json({ created: 0 });
      return;
    }

    const payload = employees.map((employee) => ({
      employee_id: employee.id,
      period_year: year,
      period_month: month,
      salary_cents: employee.base_salary_cents,
    }));

    const { error: upsertError } = await supabase
      .from("payroll_records")
      .upsert(payload, {
        onConflict: "employee_id,period_year,period_month",
        ignoreDuplicates: true,
      });

    if (upsertError) {
      res.status(500).json({ error: "Failed to generate payroll" });
      return;
    }

    res.status(200).json({ created: payload.length });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to generate payroll" });
  }
}
