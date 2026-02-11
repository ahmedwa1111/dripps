import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requirePermission } from "../../../_lib/rbac.js";

const accountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
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

  const parsed = accountSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account payload" });
    return;
  }

  const { supabase } = auth;

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("id", employeeId)
    .single();

  if (employeeError || !employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const { data: existingAccount } = await supabase
    .from("employee_accounts")
    .select("id")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (existingAccount) {
    res.status(409).json({ error: "Employee already has an account" });
    return;
  }

  try {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: employee.full_name },
    });

    if (createError || !created?.user) {
      res.status(400).json({ error: createError?.message || "Failed to create account" });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const { data: account, error: accountError } = await supabase
      .from("employee_accounts")
      .insert({
        id: created.user.id,
        employee_id: employeeId,
        email: parsed.data.email,
        password_hash: passwordHash,
        status: "active",
      })
      .select()
      .single();

    if (accountError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      res.status(500).json({ error: "Failed to save employee account" });
      return;
    }

    res.status(201).json({ account });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to create account" });
  }
}
