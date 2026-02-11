-- Add order review/process permissions and update policies

INSERT INTO public.permissions (key, description) VALUES
  ('orders.review', 'Review orders'),
  ('orders.process', 'Process orders')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

-- Ensure admin role has the new permissions
WITH admin_role AS (
  SELECT id FROM public.roles WHERE name = 'admin'
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT admin_role.id, p.id
FROM admin_role
JOIN public.permissions p ON p.key IN ('orders.review', 'orders.process')
ON CONFLICT DO NOTHING;

-- Add to moderator role by default (if desired)
WITH moderator_role AS (
  SELECT id FROM public.roles WHERE name = 'moderator'
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT moderator_role.id, p.id
FROM moderator_role
JOIN public.permissions p ON p.key IN ('orders.review', 'orders.process')
ON CONFLICT DO NOTHING;

-- Update order policies to accept review/process permissions
DROP POLICY IF EXISTS "Employees can view all orders" ON public.orders;
CREATE POLICY "Employees can view all orders" ON public.orders
  FOR SELECT USING (
    public.has_permission(auth.uid(), 'orders.read') OR
    public.has_permission(auth.uid(), 'orders.review') OR
    public.has_permission(auth.uid(), 'orders.process')
  );

DROP POLICY IF EXISTS "Employees can update orders" ON public.orders;
CREATE POLICY "Employees can update orders" ON public.orders
  FOR UPDATE USING (
    public.has_permission(auth.uid(), 'orders.update') OR
    public.has_permission(auth.uid(), 'orders.process')
  );

DROP POLICY IF EXISTS "Employees can view all order items" ON public.order_items;
CREATE POLICY "Employees can view all order items" ON public.order_items
  FOR SELECT USING (
    public.has_permission(auth.uid(), 'orders.read') OR
    public.has_permission(auth.uid(), 'orders.review') OR
    public.has_permission(auth.uid(), 'orders.process')
  );

DROP POLICY IF EXISTS "Employees can update order items" ON public.order_items;
CREATE POLICY "Employees can update order items" ON public.order_items
  FOR UPDATE USING (
    public.has_permission(auth.uid(), 'orders.update') OR
    public.has_permission(auth.uid(), 'orders.process')
  );
