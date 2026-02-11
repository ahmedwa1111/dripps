-- Employee accounts, RBAC, and payroll system

-- Enums
CREATE TYPE public.employee_account_status AS ENUM ('active', 'disabled');
CREATE TYPE public.payroll_status AS ENUM ('unpaid', 'paid');
CREATE TYPE public.payroll_payment_method AS ENUM ('cash', 'bank', 'wallet');

-- Employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  base_salary_cents INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employee accounts (linked to auth.users)
CREATE TABLE public.employee_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status public.employee_account_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);

-- Roles & permissions
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

CREATE TABLE public.account_roles (
  account_id UUID NOT NULL REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  UNIQUE (account_id, role_id)
);

-- Payroll records
CREATE TABLE public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  salary_cents INTEGER NOT NULL,
  status public.payroll_status NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  payment_method public.payroll_payment_method,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_year, period_month)
);

-- Indexes
CREATE INDEX payroll_records_employee_id_idx ON public.payroll_records(employee_id);
CREATE INDEX payroll_records_period_idx ON public.payroll_records(period_year, period_month);
CREATE INDEX payroll_records_status_idx ON public.payroll_records(status);
CREATE INDEX employee_accounts_employee_id_idx ON public.employee_accounts(employee_id);

-- Updated_at triggers
CREATE TRIGGER set_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_employee_accounts_updated_at
  BEFORE UPDATE ON public.employee_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_payroll_records_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RBAC helper functions
CREATE OR REPLACE FUNCTION public.has_employee_role(_user_id UUID, _role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_accounts ea
    JOIN public.account_roles ar ON ar.account_id = ea.id
    JOIN public.roles r ON r.id = ar.role_id
    WHERE ea.id = _user_id
      AND ea.status = 'active'
      AND r.name = _role_name
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_accounts ea
    JOIN public.account_roles ar ON ar.account_id = ea.id
    JOIN public.role_permissions rp ON rp.role_id = ar.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ea.id = _user_id
      AND ea.status = 'active'
      AND p.key = _permission
  )
$$;

CREATE OR REPLACE FUNCTION public.employee_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id
  FROM public.employee_accounts
  WHERE id = _user_id
$$;

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- Employees policies
CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (public.employee_id_for_user(auth.uid()) = id);

CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL USING (
    public.has_permission(auth.uid(), 'employees.manage') OR
    public.has_permission(auth.uid(), 'settings.manage')
  );

-- Employee accounts policies
CREATE POLICY "Employees can view own account" ON public.employee_accounts
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can manage accounts" ON public.employee_accounts
  FOR ALL USING (
    public.has_permission(auth.uid(), 'employees.manage') OR
    public.has_permission(auth.uid(), 'settings.manage')
  );

-- Roles & permissions policies
CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (public.has_permission(auth.uid(), 'settings.manage'));

CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL USING (public.has_permission(auth.uid(), 'settings.manage'));

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (public.has_permission(auth.uid(), 'settings.manage'));

CREATE POLICY "Admins can manage account roles" ON public.account_roles
  FOR ALL USING (
    public.has_permission(auth.uid(), 'employees.manage') OR
    public.has_permission(auth.uid(), 'settings.manage')
  );

CREATE POLICY "Employees can view own roles" ON public.account_roles
  FOR SELECT USING (account_id = auth.uid());

-- Payroll policies
CREATE POLICY "Employees can view own payroll" ON public.payroll_records
  FOR SELECT USING (
    public.has_permission(auth.uid(), 'payroll.read') AND
    employee_id = public.employee_id_for_user(auth.uid())
  );

CREATE POLICY "Admins can manage payroll" ON public.payroll_records
  FOR ALL USING (public.has_permission(auth.uid(), 'payroll.manage'));

-- Extend access for staff permissions on existing tables
CREATE POLICY "Employees can view all orders" ON public.orders
  FOR SELECT USING (public.has_permission(auth.uid(), 'orders.read'));

CREATE POLICY "Employees can update orders" ON public.orders
  FOR UPDATE USING (public.has_permission(auth.uid(), 'orders.update'));

CREATE POLICY "Employees can view all order items" ON public.order_items
  FOR SELECT USING (public.has_permission(auth.uid(), 'orders.read'));

CREATE POLICY "Employees can update order items" ON public.order_items
  FOR UPDATE USING (public.has_permission(auth.uid(), 'orders.update'));

CREATE POLICY "Employees can view all products" ON public.products
  FOR SELECT USING (public.has_permission(auth.uid(), 'products.read'));

CREATE POLICY "Employees can create products" ON public.products
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'products.create'));

CREATE POLICY "Employees can update products" ON public.products
  FOR UPDATE USING (public.has_permission(auth.uid(), 'products.update'));

CREATE POLICY "Employees can delete products" ON public.products
  FOR DELETE USING (
    public.has_permission(auth.uid(), 'products.update') OR
    public.has_permission(auth.uid(), 'settings.manage')
  );

CREATE POLICY "Employees can view profiles" ON public.profiles
  FOR SELECT USING (public.has_permission(auth.uid(), 'customers.read'));

-- Seed permissions
INSERT INTO public.permissions (key, description) VALUES
  ('orders.read', 'View orders'),
  ('orders.update', 'Update orders'),
  ('products.read', 'View products'),
  ('products.create', 'Create products'),
  ('products.update', 'Update products'),
  ('customers.read', 'View customers'),
  ('reports.read', 'View reports'),
  ('payroll.read', 'View payroll'),
  ('payroll.manage', 'Manage payroll'),
  ('employees.manage', 'Manage employees'),
  ('settings.manage', 'Manage settings')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

-- Seed roles
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('moderator', 'Limited operational access')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Admin role gets all permissions
WITH admin_role AS (
  SELECT id FROM public.roles WHERE name = 'admin'
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT admin_role.id, p.id
FROM admin_role
JOIN public.permissions p ON true
ON CONFLICT DO NOTHING;

-- Moderator role gets limited permissions
WITH moderator_role AS (
  SELECT id FROM public.roles WHERE name = 'moderator'
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT moderator_role.id, p.id
FROM moderator_role
JOIN public.permissions p ON p.key IN (
  'orders.read',
  'orders.update',
  'products.read',
  'customers.read',
  'reports.read',
  'payroll.read'
)
ON CONFLICT DO NOTHING;
