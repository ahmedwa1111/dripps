import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../../_lib/rbac.js";

const rolesSchema = z.object({
  roleIds: z.array(z.string()).default([]),
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

  const parsed = rolesSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { supabase } = auth;

  const { error: deleteError } = await supabase
    .from("account_roles")
    .delete()
    .eq("account_id", accountId);

  if (deleteError) {
    res.status(500).json({ error: "Failed to reset account roles" });
    return;
  }

  const payload = parsed.data.roleIds.map((roleId) => ({
    account_id: accountId,
    role_id: roleId,
  }));

  if (payload.length > 0) {
    const { error: insertError } = await supabase
      .from("account_roles")
      .insert(payload);

    if (insertError) {
      res.status(500).json({ error: "Failed to assign roles" });
      return;
    }
  }

  res.status(200).json({ ok: true });
}
