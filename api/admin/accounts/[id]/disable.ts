import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../../_lib/rbac.js";

const disableSchema = z.object({
  disabled: z.boolean(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requirePermission(req as any, res as any, "employees.manage");
  if (!auth) return;

  const accountId = req.query.id;
  if (!accountId || Array.isArray(accountId)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const parsed = disableSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const status = parsed.data.disabled ? "disabled" : "active";
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("employee_accounts")
    .update({ status })
    .eq("id", accountId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to update account status" });
    return;
  }

  res.status(200).json({ account: data });
}
