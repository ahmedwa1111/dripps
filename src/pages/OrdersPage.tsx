import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { OrderStatus } from '@/types';
import { Navigate } from 'react-router-dom';

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: orders = [], isLoading } = useUserOrders();

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p>Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: { pathname: '/orders' } }} />;
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="font-display text-3xl font-bold mb-8">My Orders</h1>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-32" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (orders.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold mb-4">No orders yet</h1>
            <p className="text-muted-foreground mb-8">
              You haven't placed any orders yet. Start shopping to see your orders here.
            </p>
            <Link to="/shop">
              <Button variant="hero" size="lg">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-8">My Orders</h1>

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-drip-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display font-semibold">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </h3>
                    <Badge className={statusColors[order.status]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Placed on {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-display font-bold text-lg">
                      {formatCurrency(Number(order.total))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
