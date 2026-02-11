import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../../_lib/rbac.js";

const updateSchema = z.object({
  full_name: z.string().min(1).optional(),
  job_title: z.string().min(1).optional(),
  base_salary_cents: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requirePermission(req as any, res as any, "employees.manage");
  if (!auth) return;

  const employeeId = req.query.id;
  if (!employeeId || Array.isArray(employeeId)) {
    res.status(400).json({ error: "Invalid employee id" });
    return;
  }

  const parsed = updateSchema.safeParse(req.body ?? {});
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Invalid employee payload" });
    return;
  }

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("employees")
    .update(parsed.data)
    .eq("id", employeeId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to update employee" });
    return;
  }

  res.status(200).json({ employee: data });
}
