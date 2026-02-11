import type { Request, Response } from "express";
import { getSupabaseAdminClient } from "./supabase.js";

export type EmployeeAccountRecord = {
  id: string;
  employee_id: string;
  email: string;
  status: "active" | "disabled";
  last_login_at: string | null;
  employee?: {
    id: string;
    full_name: string;
    job_title: string;
    base_salary_cents: number;
    is_active: boolean;
  } | null;
};

export type AuthContext = {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  token: string;
  user: { id: string; email?: string | null };
  account: EmployeeAccountRecord | null;
};

const getAccessToken = (req: Request) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || Array.isArray(header)) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const hasLegacyStaffRole = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string
) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) return false;
  return data.some((row) => row.role === "admin" || row.role === "manager");
};

const fetchEmployeeAccount = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string
) => {
  const { data, error } = await supabase
    .from("employee_accounts")
    .select(
      "id, employee_id, email, status, last_login_at, employee:employees(id, full_name, job_title, base_salary_cents, is_active)"
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error("Failed to load employee account");
  }
  if (!data) return null;
  const row = data as any;
  const employeeData = row.employee as any;
  const employee = Array.isArray(employeeData) ? employeeData[0] : employeeData;
  return {
    id: row.id,
    employee_id: row.employee_id,
    email: row.email,
    status: row.status,
    last_login_at: row.last_login_at ?? null,
    employee: employee
      ? {
          id: employee.id,
          full_name: employee.full_name,
          job_title: employee.job_title,
          base_salary_cents: employee.base_salary_cents,
          is_active: employee.is_active,
        }
      : null,
  } satisfies EmployeeAccountRecord;
};

export const listAccountRoles = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  accountId: string
) => {
  const { data, error } = await supabase
    .from("account_roles")
    .select("role:roles(id, name, description)")
    .eq("account_id", accountId);
  if (error) {
    throw new Error("Failed to load account roles");
  }
  return (data || [])
    .map((row) => {
      const roleData = (row as any).role as unknown;
      const role = Array.isArray(roleData) ? roleData[0] : roleData;
      if (!role) return null;
      return {
        id: role.id,
        name: role.name,
        description: role.description ?? null,
      };
    })
    .filter(Boolean) as Array<{ id: string; name: string; description: string | null }>;
};

export const listAccountPermissions = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  accountId: string
) => {
  const { data, error } = await supabase
    .from("account_roles")
    .select("role:roles(role_permissions(permission:permissions(key)))")
    .eq("account_id", accountId);
  if (error) {
    throw new Error("Failed to load account permissions");
  }

  const keys = new Set<string>();
  (data || []).forEach((row) => {
    const role = row.role as any;
    const perms = role?.role_permissions || [];
    perms.forEach((perm: any) => {
      if (perm?.permission?.key) {
        keys.add(perm.permission.key);
      }
    });
  });
  return Array.from(keys);
};

export const requireAuth = async (
  req: Request,
  res: Response,
  options?: { requireEmployee?: boolean }
): Promise<AuthContext | null> => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  let account: EmployeeAccountRecord | null = null;
  if (options?.requireEmployee) {
    try {
      account = await fetchEmployeeAccount(supabase, userData.user.id);
    } catch (error) {
      res.status(500).json({ error: "Failed to load employee account" });
      return null;
    }
    if (!account) {
      res.status(403).json({ error: "Employee account required" });
      return null;
    }
    if (account.status !== "active") {
      res.status(403).json({ error: "Account disabled" });
      return null;
    }
  }

  return {
    supabase,
    token,
    user: { id: userData.user.id, email: userData.user.email },
    account,
  };
};

export const requireAdmin = async (req: Request, res: Response) => {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const { supabase, user } = auth;

  const legacyStaff = await hasLegacyStaffRole(supabase, user.id);
  if (legacyStaff) return auth;

  const { data: hasSettings, error: settingsError } = await supabase.rpc(
    "has_permission",
    {
      _user_id: user.id,
      _permission: "settings.manage",
    }
  );
  if (settingsError) {
    res.status(500).json({ error: "Failed to verify admin permissions" });
    return null;
  }
  if (hasSettings) return auth;

  const { data: hasEmployees, error: employeesError } = await supabase.rpc(
    "has_permission",
    {
      _user_id: user.id,
      _permission: "employees.manage",
    }
  );
  if (employeesError) {
    res.status(500).json({ error: "Failed to verify admin permissions" });
    return null;
  }
  if (hasEmployees) return auth;

  const { data: hasRole, error: roleError } = await supabase.rpc(
    "has_employee_role",
    {
      _user_id: user.id,
      _role_name: "admin",
    }
  );
  if (roleError) {
    res.status(500).json({ error: "Failed to verify admin role" });
    return null;
  }

  if (!hasRole) {
    res.status(403).json({ error: "Not authorized" });
    return null;
  }

  return auth;
};

export const requirePermission = async (
  req: Request,
  res: Response,
  permission: string
) => {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const { supabase, user } = auth;

  const legacyStaff = await hasLegacyStaffRole(supabase, user.id);
  if (legacyStaff) return auth;

  const { data: allowed, error } = await supabase.rpc("has_permission", {
    _user_id: user.id,
    _permission: permission,
  });

  if (error) {
    res.status(500).json({ error: "Failed to verify permissions" });
    return null;
  }

  if (!allowed) {
    res.status(403).json({ error: "Not authorized" });
    return null;
  }

  return auth;
};

export const requireEmployee = async (req: Request, res: Response) => {
  const auth = await requireAuth(req, res, { requireEmployee: true });
  if (!auth) return null;
  return auth;
};
