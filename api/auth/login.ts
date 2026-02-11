import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getSupabaseAnonClient, getSupabaseAdminClient } from "../_lib/supabase.js";
import { listAccountPermissions, listAccountRoles } from "../_lib/rbac.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const supabaseAuth = getSupabaseAnonClient();
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data?.session) {
      res.status(401).json({ error: error?.message || "Invalid credentials" });
      return;
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: account, error: accountError } = await supabaseAdmin
      .from("employee_accounts")
      .select(
        "id, employee_id, email, status, last_login_at, employee:employees(id, full_name, job_title, base_salary_cents, is_active)"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (accountError) {
      res.status(500).json({ error: "Failed to load employee account" });
      return;
    }

    if (!account) {
      res.status(403).json({ error: "Employee account required" });
      return;
    }

    if (account.status !== "active") {
      res.status(403).json({ error: "Account disabled" });
      return;
    }

    await supabaseAdmin
      .from("employee_accounts")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", account.id);

    const roles = await listAccountRoles(supabaseAdmin, account.id);
    const permissions = await listAccountPermissions(supabaseAdmin, account.id);

    res.status(200).json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
      account,
      roles,
      permissions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Login failed" });
  }
}
