import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../../_lib/rbac.js";

const toggleSchema = z.object({
  is_active: z.boolean(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
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

  const parsed = toggleSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: parsed.data.is_active })
    .eq("id", employeeId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to update employee" });
    return;
  }

  res.status(200).json({ employee: data });
}
