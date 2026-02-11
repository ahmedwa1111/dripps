import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireEmployee, listAccountPermissions, listAccountRoles } from "../_lib/rbac.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
}
