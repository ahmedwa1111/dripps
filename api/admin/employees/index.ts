import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requirePermission } from "../../_lib/rbac.js";

const createSchema = z.object({
  full_name: z.string().min(1),
  job_title: z.string().min(1),
  base_salary_cents: z.number().int().nonnegative(),
  is_active: z.boolean().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const auth = await requirePermission(req as any, res as any, "employees.manage");
    if (!auth) return;

    try {
      const { supabase } = auth;
      const { data: employees, error } = await supabase
        .from("employees")
        .select("id, full_name, job_title, base_salary_cents, is_active, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) {
        res.status(500).json({ error: "Failed to load employees" });
        return;
      }

      if (!employees || employees.length === 0) {
        res.status(200).json({ employees: [] });
        return;
      }

      const employeeIds = employees.map((employee) => employee.id);
      const { data: accounts, error: accountsError } = await supabase
        .from("employee_accounts")
        .select("id, employee_id, email, status, last_login_at")
        .in("employee_id", employeeIds);

      if (accountsError) {
        res.status(500).json({ error: "Failed to load employee accounts" });
        return;
      }

      const accountIds = (accounts || []).map((account) => account.id);
      let rolesByAccount: Record<string, Array<{ id: string; name: string }>> = {};

      if (accountIds.length > 0) {
        const { data: accountRoles, error: rolesError } = await supabase
          .from("account_roles")
          .select("account_id, role:roles(id, name)")
          .in("account_id", accountIds);

        if (rolesError) {
          res.status(500).json({ error: "Failed to load account roles" });
          return;
        }

        rolesByAccount = (accountRoles || []).reduce((acc, row) => {
          if (!row.role) return acc;
          if (!acc[row.account_id]) acc[row.account_id] = [];
          acc[row.account_id].push(row.role as { id: string; name: string });
          return acc;
        }, {} as Record<string, Array<{ id: string; name: string }>>);
      }

      const accountsByEmployee = (accounts || []).reduce((acc, account) => {
        acc[account.employee_id] = account;
        return acc;
      }, {} as Record<string, any>);

      const payload = employees.map((employee) => {
        const account = accountsByEmployee[employee.id] || null;
        return {
          ...employee,
          account: account
            ? {
                ...account,
                roles: rolesByAccount[account.id] || [],
              }
            : null,
        };
      });

      res.status(200).json({ employees: payload });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to load employees" });
    }
    return;
  }

  if (req.method === "POST") {
    const auth = await requirePermission(req as any, res as any, "employees.manage");
    if (!auth) return;

    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid employee payload" });
      return;
    }

    const { supabase } = auth;
    const { full_name, job_title, base_salary_cents, is_active } = parsed.data;

    const { data, error } = await supabase
      .from("employees")
      .insert({
        full_name,
        job_title,
        base_salary_cents,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to create employee" });
      return;
    }

    res.status(201).json({ employee: data });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
