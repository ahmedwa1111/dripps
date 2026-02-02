import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { useDashboardStats, useRecentOrders, useOrdersByStatus, useRevenueByMonth } from '@/hooks/useDashboard';
import { DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { OrderStatus } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const CHART_COLORS = ['#a855f7', '#eab308', '#22c55e', '#3b82f6', '#ef4444'];

export default function AdminDashboardPage() {
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: recentOrders = [], isLoading: loadingOrders } = useRecentOrders(5);
  const { data: ordersByStatus = [] } = useOrdersByStatus();
  const { data: revenueByMonth = [] } = useRevenueByMonth();

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={loadingStats ? '...' : formatCurrency(stats?.totalRevenue ?? 0)}
            change={stats?.revenueChange}
            icon={DollarSign}
            iconColor="text-green-600"
          />
          <StatCard
            title="Total Orders"
            value={loadingStats ? '...' : stats?.totalOrders || 0}
            change={stats?.ordersChange}
            icon={ShoppingCart}
            iconColor="text-primary"
          />
          <StatCard
            title="Products"
            value={loadingStats ? '...' : stats?.totalProducts || 0}
            icon={Package}
            iconColor="text-secondary-foreground"
          />
          <StatCard
            title="Customers"
            value={loadingStats ? '...' : stats?.totalCustomers || 0}
            icon={Users}
            iconColor="text-blue-600"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-display text-lg font-semibold mb-6">Revenue Overview</h3>
            <div className="h-64">
              {revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No revenue data yet
                </div>
              )}
            </div>
          </div>

          {/* Orders by Status */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-display text-lg font-semibold mb-6">Orders by Status</h3>
            <div className="h-64">
              {ordersByStatus.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatus.filter(s => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {ordersByStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No orders yet
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {ordersByStatus.map((status, index) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {status.name} ({status.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="font-display text-lg font-semibold">Recent Orders</h3>
            <Link to="/admin/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Order ID
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm">{order.customer_name || order.customer_email || 'Guest'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={statusColors[order.status as OrderStatus]}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-4 px-6 text-right font-medium">
                        {formatCurrency(Number(order.total))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
