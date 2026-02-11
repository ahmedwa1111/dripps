import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../../_lib/rbac.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
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

  const { supabase } = auth;

  const { error: deleteError } = await supabase.auth.admin.deleteUser(accountId);
  if (deleteError) {
    res.status(500).json({ error: deleteError.message || "Failed to delete account" });
    return;
  }

  res.status(200).json({ ok: true });
}
