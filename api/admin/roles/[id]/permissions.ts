import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../../_lib/rbac.js";

const permissionsSchema = z.object({
  permissionKeys: z.array(z.string()).default([]),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requirePermission(req as any, res as any, "settings.manage");
  if (!auth) return;

  const roleId = req.query.id;
  if (!roleId || Array.isArray(roleId)) {
    res.status(400).json({ error: "Invalid role id" });
    return;
  }

  const parsed = permissionsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { supabase } = auth;

  const { data: perms, error: permsError } = await supabase
    .from("permissions")
    .select("id")
    .in("key", parsed.data.permissionKeys);

  if (permsError) {
    res.status(500).json({ error: "Failed to resolve permissions" });
    return;
  }

  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) {
    res.status(500).json({ error: "Failed to reset role permissions" });
    return;
  }

  const payload = (perms || []).map((perm) => ({
    role_id: roleId,
    permission_id: perm.id,
  }));

  if (payload.length > 0) {
    const { error: insertError } = await supabase
      .from("role_permissions")
      .insert(payload);

    if (insertError) {
      res.status(500).json({ error: "Failed to assign permissions" });
      return;
    }
  }

  res.status(200).json({ ok: true });
}
