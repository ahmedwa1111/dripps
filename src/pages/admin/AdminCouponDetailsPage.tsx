import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCoupon, useCouponRedemptions } from '@/hooks/useCoupons';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function AdminCouponDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data: coupon, isLoading: couponLoading } = useCoupon(id);
  const { data: redemptions = [], isLoading: redemptionsLoading } = useCouponRedemptions(id);

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          You need an admin account to view coupon usage.
        </div>
      </AdminLayout>
    );
  }
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Admin / Coupons</p>
            <h1 className="font-display text-2xl font-bold">Coupon Details</h1>
          </div>
          <Link to="/admin/coupons">
            <Button variant="outline">Back to Coupons</Button>
          </Link>
        </div>

        {couponLoading ? (
          <div className="bg-card border border-border rounded-xl p-6">Loading coupon...</div>
        ) : !coupon ? (
          <div className="bg-card border border-border rounded-xl p-6 text-muted-foreground">
            Coupon not found.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">{coupon.code}</h2>
                <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                  {coupon.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground capitalize">{coupon.type} coupon</p>
              <div className="text-sm">
                <p>
                  Value:{' '}
                  <span className="font-medium">
                    {coupon.type === 'percentage'
                      ? `${coupon.value}%`
                      : formatCurrency(Number(coupon.value))}
                  </span>
                </p>
                {coupon.min_order_amount != null && (
                  <p>Minimum order: {formatCurrency(Number(coupon.min_order_amount))}</p>
                )}
                {coupon.max_discount_amount != null && (
                  <p>Max discount: {formatCurrency(Number(coupon.max_discount_amount))}</p>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h3 className="font-display text-lg font-semibold">Usage</h3>
              <p className="text-sm">
                Used: <span className="font-medium">{coupon.used_count}</span>
              </p>
              <p className="text-sm">
                Total limit:{' '}
                <span className="font-medium">
                  {coupon.usage_limit_total ?? 'Unlimited'}
                </span>
              </p>
              <p className="text-sm">
                Per-user limit:{' '}
                <span className="font-medium">
                  {coupon.usage_limit_per_user ?? 'Unlimited'}
                </span>
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h3 className="font-display text-lg font-semibold">Validity</h3>
              <p className="text-sm">
                Starts:{' '}
                <span className="font-medium">
                  {coupon.starts_at ? format(new Date(coupon.starts_at), 'MMM d, yyyy') : 'Anytime'}
                </span>
              </p>
              <p className="text-sm">
                Expires:{' '}
                <span className="font-medium">
                  {coupon.expires_at ? format(new Date(coupon.expires_at), 'MMM d, yyyy') : 'Never'}
                </span>
              </p>
              <p className="text-sm">
                Applies to:{' '}
                <span className="font-medium">
                  {coupon.apply_to_all
                    ? 'All products'
                    : coupon.applicable_product_ids?.length
                    ? `${coupon.applicable_product_ids.length} products`
                    : coupon.applicable_category_ids?.length
                    ? `${coupon.applicable_category_ids.length} categories`
                    : 'Restricted'}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Usage History</h2>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptionsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    Loading usage...
                  </TableCell>
                </TableRow>
              ) : redemptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No redemptions yet.
                  </TableCell>
                </TableRow>
              ) : (
                redemptions.map((redemption) => (
                  <TableRow key={redemption.id}>
                    <TableCell>
                      {format(new Date(redemption.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {redemption.user_id ? redemption.user_id.slice(0, 8) : 'Guest'}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/orders/${redemption.order_id}`}
                        className="text-primary hover:underline"
                      >
                        {redemption.order_id.slice(0, 8).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      -{formatCurrency(Number(redemption.discount_amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}



