import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requireAdmin, requirePermission } from "../../_lib/rbac.js";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const auth = await requireAdmin(req as any, res as any);
    if (!auth) return;

    const { supabase } = auth;
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name, description")
      .order("name");

    if (rolesError) {
      res.status(500).json({ error: "Failed to load roles" });
      return;
    }

    const { data: permissions, error: permissionsError } = await supabase
      .from("permissions")
      .select("id, key, description")
      .order("key");

    if (permissionsError) {
      res.status(500).json({ error: "Failed to load permissions" });
      return;
    }

    const { data: rolePermissions, error: rolePermError } = await supabase
      .from("role_permissions")
      .select("role_id, permission_id");

    if (rolePermError) {
      res.status(500).json({ error: "Failed to load role permissions" });
      return;
    }

    const permissionIdsByRole = (rolePermissions || []).reduce((acc, row) => {
      if (!acc[row.role_id]) acc[row.role_id] = [];
      acc[row.role_id].push(row.permission_id);
      return acc;
    }, {} as Record<string, string[]>);

    const rolesWithPermissions = (roles || []).map((role) => ({
      ...role,
      permissionIds: permissionIdsByRole[role.id] || [],
    }));

    res.status(200).json({ roles: rolesWithPermissions, permissions });
    return;
  }

  if (req.method === "POST") {
    const auth = await requirePermission(req as any, res as any, "settings.manage");
    if (!auth) return;

    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid role payload" });
      return;
    }

    const { supabase } = auth;
    const { name, description, permissionKeys } = parsed.data;

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({ name, description: description ?? null })
      .select()
      .single();

    if (roleError) {
      res.status(500).json({ error: "Failed to create role" });
      return;
    }

    if (permissionKeys && permissionKeys.length > 0) {
      const { data: perms, error: permsError } = await supabase
        .from("permissions")
        .select("id")
        .in("key", permissionKeys);

      if (permsError) {
        res.status(500).json({ error: "Failed to resolve permissions" });
        return;
      }

      const payload = (perms || []).map((perm) => ({
        role_id: role.id,
        permission_id: perm.id,
      }));

      if (payload.length > 0) {
        const { error: rpError } = await supabase
          .from("role_permissions")
          .insert(payload);

        if (rpError) {
          res.status(500).json({ error: "Failed to assign permissions" });
          return;
        }
      }
    }

    res.status(201).json({ role });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
