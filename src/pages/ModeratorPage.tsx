import { useEffect, useMemo, useState } from 'react';
import { ModeratorLayout } from '@/components/moderator/ModeratorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type PayrollRow = {
  id: string;
  period_year: number;
  period_month: number;
  salary_cents: number;
  status: 'paid' | 'unpaid';
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
};

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export default function ModeratorPage() {
  const { session, employeeAccount, permissions, hasPermission } = useAuth();
  const token = session?.access_token;

  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(true);

  const canReadOrders = hasPermission('orders.read') || hasPermission('orders.review') || hasPermission('orders.process');
  const canUpdateOrders = hasPermission('orders.update') || hasPermission('orders.process');
  const canReadProducts = hasPermission('products.read');
  const canReadPayroll = hasPermission('payroll.read');

  const { data: orders = [] } = useOrders(canReadOrders ? {} : undefined);
  const updateOrderStatus = useUpdateOrderStatus();
  const { data: products = [] } = useProducts({ includeInactive: true, enabled: canReadProducts });

  const profile = employeeAccount?.employee ?? null;

  const loadPayroll = async () => {
    if (!token || !canReadPayroll) return;
    setPayrollLoading(true);
    try {
      const resp = await fetch('/api/moderator/payroll', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to load payroll');
      }
      setPayroll(data.payroll || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load payroll');
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    if (token && canReadPayroll) {
      loadPayroll();
    }
  }, [token, canReadPayroll]);

  const payrollTitle = useMemo(() => {
    if (!profile) return 'My Payroll';
    return `My Payroll (${profile.full_name})`;
  }, [profile]);

  return (
    <ModeratorLayout>
      <div className="space-y-8">
        <section id="overview" className="space-y-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Moderator Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'team member'}.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="text-lg font-semibold">{profile?.job_title || 'Moderator'}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Permissions</p>
              <p className="text-lg font-semibold">{permissions.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Account Status</p>
              <p className="text-lg font-semibold capitalize">{employeeAccount?.status || 'active'}</p>
            </div>
          </div>
        </section>

        {canReadPayroll && (
          <section id="payroll" className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold">{payrollTitle}</h2>
              <p className="text-muted-foreground">Review your monthly payroll records</p>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid At</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : payroll.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No payroll records yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payroll.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.period_year}-{record.period_month.toString().padStart(2, '0')}
                          </TableCell>
                          <TableCell>{formatCurrency(record.salary_cents / 100)}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.paid_at ? new Date(record.paid_at).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>{record.payment_method || '-'}</TableCell>
                          <TableCell className="max-w-[240px] truncate">
                            {record.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        )}

        {canReadOrders && (
          <section id="orders" className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Orders</h2>
              <p className="text-muted-foreground">
                {canUpdateOrders ? 'Manage order statuses' : 'Read-only access to orders'}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Placed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No orders found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id.slice(0, 8)}</TableCell>
                          <TableCell>{order.customer_name || order.customer_email || '-'}</TableCell>
                          <TableCell>
                            {canUpdateOrders ? (
                              <select
                                value={order.status}
                                onChange={(e) =>
                                  updateOrderStatus.mutate({
                                    id: order.id,
                                    status: e.target.value as typeof order.status,
                                  })
                                }
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              >
                                {ORDER_STATUSES.map((statusOption) => (
                                  <option key={statusOption} value={statusOption}>
                                    {statusOption}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge variant="secondary">{order.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(order.total)}</TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        )}

        {canReadProducts && (
          <section id="products" className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Products</h2>
              <p className="text-muted-foreground">Read-only view of the catalog</p>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No products found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        )}

        {!canReadOrders && !canReadProducts && !canReadPayroll && (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">No Assigned Permissions</h2>
            <p className="text-muted-foreground mt-2">
              Your account has no active permissions. Contact an administrator to enable access.
            </p>
          </section>
        )}
      </div>
    </ModeratorLayout>
  );
}
