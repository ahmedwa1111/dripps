import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../../_lib/rbac.js";

const markSchema = z.object({
  paid: z.boolean(),
  paid_at: z.string().datetime().optional(),
  payment_method: z.enum(["cash", "bank", "wallet"]).optional(),
  notes: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requirePermission(req as any, res as any, "payroll.manage");
  if (!auth) return;

  const payrollId = req.query.id;
  if (!payrollId || Array.isArray(payrollId)) {
    res.status(400).json({ error: "Invalid payroll id" });
    return;
  }

  const parsed = markSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { paid, paid_at, payment_method, notes } = parsed.data;
  const updatePayload: Record<string, any> = {
    status: paid ? "paid" : "unpaid",
    paid_at: paid ? paid_at ?? new Date().toISOString() : null,
    payment_method: paid ? payment_method ?? null : null,
  };

  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("payroll_records")
    .update(updatePayload)
    .eq("id", payrollId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to update payroll record" });
    return;
  }

  res.status(200).json({ payroll: data });
}
