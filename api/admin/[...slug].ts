import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  requireAdmin,
  requirePermission,
} from "../_lib/rbac.js";

const employeeCreateSchema = z.object({
  full_name: z.string().min(1),
  job_title: z.string().min(1),
  base_salary_cents: z.number().int().nonnegative(),
  is_active: z.boolean().optional(),
});

const employeeUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  job_title: z.string().min(1).optional(),
  base_salary_cents: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

const toggleSchema = z.object({
  is_active: z.boolean(),
});

const accountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const disableSchema = z.object({
  disabled: z.boolean(),
});

const rolesSchema = z.object({
  roleIds: z.array(z.string()).default([]),
});

const roleCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).optional(),
});

const permissionsSchema = z.object({
  permissionKeys: z.array(z.string()).default([]),
});

const payrollGenerateSchema = z.object({
  year: z.number().int().min(2000),
  month: z.number().int().min(1).max(12),
});

const payrollMarkSchema = z.object({
  paid: z.boolean(),
  paid_at: z.string().datetime().optional(),
  payment_method: z.enum(["cash", "bank", "wallet"]).optional(),
  notes: z.string().optional(),
});

const parseNumber = (value?: string | string[]) => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseString = (value?: string | string[]) => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
};

const getSegments = (req: VercelRequest) => {
  const slug = req.query.slug;
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
};

const handleEmployees = async (
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) => {
  if (segments.length === 0) {
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
            const roleData = (row as any).role as unknown;
            const role = Array.isArray(roleData) ? roleData[0] : roleData;
            if (!role || !role.id || !role.name) return acc;
            if (!acc[row.account_id]) acc[row.account_id] = [];
            acc[row.account_id].push({ id: role.id, name: role.name });
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

      const parsed = employeeCreateSchema.safeParse(req.body ?? {});
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
    return;
  }

  const employeeId = segments[0];
  if (!employeeId) {
    res.status(400).json({ error: "Invalid employee id" });
    return;
  }

  if (segments.length === 1) {
    if (req.method !== "PUT") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const auth = await requirePermission(req as any, res as any, "employees.manage");
    if (!auth) return;

    const parsed = employeeUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Invalid employee payload" });
      return;
    }

    const { supabase } = auth;
    const { data, error } = await supabase
      .from("employees")
      .update(parsed.data)
      .eq("id", employeeId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to update employee" });
      return;
    }

    res.status(200).json({ employee: data });
    return;
  }

  if (segments.length === 2) {
    const action = segments[1];
    if (action === "toggle-active") {
      if (req.method !== "PATCH") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const auth = await requirePermission(req as any, res as any, "employees.manage");
      if (!auth) return;

      const parsed = toggleSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
      }

      const { supabase } = auth;
      const { data, error } = await supabase
        .from("employees")
        .update({ is_active: parsed.data.is_active })
        .eq("id", employeeId)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: "Failed to update employee" });
        return;
      }

      res.status(200).json({ employee: data });
      return;
    }

    if (action === "account") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const auth = await requirePermission(req as any, res as any, "employees.manage");
      if (!auth) return;

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
      return;
    }
  }

  res.status(404).json({ error: "Not found" });
};

const handleAccounts = async (
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) => {
  const accountId = segments[0];
  if (!accountId) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  if (segments.length === 1) {
    if (req.method !== "DELETE") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const auth = await requirePermission(req as any, res as any, "employees.manage");
    if (!auth) return;

    const { supabase } = auth;
    const { error: deleteError } = await supabase.auth.admin.deleteUser(accountId);
    if (deleteError) {
      res.status(500).json({ error: deleteError.message || "Failed to delete account" });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  if (segments.length === 2) {
    const action = segments[1];
    if (action === "disable") {
      if (req.method !== "PATCH") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const auth = await requirePermission(req as any, res as any, "employees.manage");
      if (!auth) return;

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
      return;
    }

    if (action === "roles") {
      if (req.method !== "PATCH") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const auth = await requirePermission(req as any, res as any, "employees.manage");
      if (!auth) return;

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
      return;
    }
  }

  res.status(404).json({ error: "Not found" });
};

const handleRoles = async (
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) => {
  if (segments.length === 0) {
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

      const parsed = roleCreateSchema.safeParse(req.body ?? {});
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
    return;
  }

  if (segments.length === 2 && segments[1] === "permissions") {
    if (req.method !== "PATCH") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const roleId = segments[0];
    if (!roleId) {
      res.status(400).json({ error: "Invalid role id" });
      return;
    }

    const auth = await requirePermission(req as any, res as any, "settings.manage");
    if (!auth) return;

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
    return;
  }

  res.status(404).json({ error: "Not found" });
};

const handlePayroll = async (
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) => {
  if (segments.length === 0) {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const auth = await requirePermission(req as any, res as any, "payroll.manage");
    if (!auth) return;

    const year = parseNumber(req.query.year as any);
    const month = parseNumber(req.query.month as any);
    const status = parseString(req.query.status as any);
    const q = parseString(req.query.q as any);

    const { supabase } = auth;

    try {
      let employeeFilterIds: string[] | null = null;
      if (q) {
        const { data: matches, error: matchError } = await supabase
          .from("employees")
          .select("id")
          .or(`full_name.ilike.%${q}%,job_title.ilike.%${q}%`);

        if (matchError) {
          res.status(500).json({ error: "Failed to filter employees" });
          return;
        }

        employeeFilterIds = (matches || []).map((row) => row.id);
        if (employeeFilterIds.length === 0) {
          res.status(200).json({ payroll: [] });
          return;
        }
      }

      let query = supabase
        .from("payroll_records")
        .select(
          "id, employee_id, period_year, period_month, salary_cents, status, paid_at, payment_method, notes, created_at, updated_at, employee:employees(id, full_name, job_title, base_salary_cents, is_active)"
        )
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });

      if (year) query = query.eq("period_year", year);
      if (month) query = query.eq("period_month", month);
      if (status) query = query.eq("status", status);
      if (employeeFilterIds) query = query.in("employee_id", employeeFilterIds);

      const { data, error } = await query;
      if (error) {
        res.status(500).json({ error: "Failed to load payroll records" });
        return;
      }

      res.status(200).json({ payroll: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to load payroll" });
    }
    return;
  }

  if (segments.length === 1 && segments[0] === "generate") {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const auth = await requirePermission(req as any, res as any, "payroll.manage");
    if (!auth) return;

    const parsed = payrollGenerateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const { year, month } = parsed.data;
    const { supabase } = auth;

    try {
      const { data: employees, error } = await supabase
        .from("employees")
        .select("id, base_salary_cents")
        .eq("is_active", true);

      if (error) {
        res.status(500).json({ error: "Failed to load employees" });
        return;
      }

      if (!employees || employees.length === 0) {
        res.status(200).json({ created: 0 });
        return;
      }

      const payload = employees.map((employee) => ({
        employee_id: employee.id,
        period_year: year,
        period_month: month,
        salary_cents: employee.base_salary_cents,
      }));

      const { error: upsertError } = await supabase
        .from("payroll_records")
        .upsert(payload, {
          onConflict: "employee_id,period_year,period_month",
          ignoreDuplicates: true,
        });

      if (upsertError) {
        res.status(500).json({ error: "Failed to generate payroll" });
        return;
      }

      res.status(200).json({ created: payload.length });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to generate payroll" });
    }
    return;
  }

  if (segments.length === 1 && segments[0] === "summary") {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const auth = await requirePermission(req as any, res as any, "payroll.manage");
    if (!auth) return;

    const year = parseNumber(req.query.year as any);
    const month = parseNumber(req.query.month as any);

    const { supabase } = auth;

    let query = supabase
      .from("payroll_records")
      .select("salary_cents, status");

    if (year) query = query.eq("period_year", year);
    if (month) query = query.eq("period_month", month);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "Failed to load payroll summary" });
      return;
    }

    const summary = {
      totalEmployees: 0,
      totalPayrollCents: 0,
      totalPaidCents: 0,
      totalUnpaidCents: 0,
      paidCount: 0,
      unpaidCount: 0,
    };

    (data || []).forEach((row) => {
      summary.totalEmployees += 1;
      summary.totalPayrollCents += row.salary_cents;
      if (row.status === "paid") {
        summary.totalPaidCents += row.salary_cents;
        summary.paidCount += 1;
      } else {
        summary.totalUnpaidCents += row.salary_cents;
        summary.unpaidCount += 1;
      }
    });

    res.status(200).json({ summary });
    return;
  }

  if (segments.length === 2 && segments[1] === "mark-paid") {
    if (req.method !== "PATCH") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const payrollId = segments[0];
    if (!payrollId) {
      res.status(400).json({ error: "Invalid payroll id" });
      return;
    }

    const auth = await requirePermission(req as any, res as any, "payroll.manage");
    if (!auth) return;

    const parsed = payrollMarkSchema.safeParse(req.body ?? {});
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
    return;
  }

  res.status(404).json({ error: "Not found" });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = getSegments(req);
  if (segments.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [group, ...rest] = segments;

  if (group === "employees") {
    await handleEmployees(req, res, rest);
    return;
  }

  if (group === "accounts") {
    await handleAccounts(req, res, rest);
    return;
  }

  if (group === "roles") {
    await handleRoles(req, res, rest);
    return;
  }

  if (group === "payroll") {
    await handlePayroll(req, res, rest);
    return;
  }

  res.status(404).json({ error: "Not found" });
}
