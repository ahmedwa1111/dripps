import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { OrderStatus } from '@/types';

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Package className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  delivered: <CheckCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const { data: orders = [], isLoading } = useOrders(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateStatus.mutate({ id: orderId, status });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Manage customer orders</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <span className="font-mono text-sm">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name || 'Guest'}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        <span className="flex items-center gap-1">
                          {statusIcons[order.status]}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(order.total))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(order.id, 'pending')}
                            disabled={order.status === 'pending'}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(order.id, 'processing')}
                            disabled={order.status === 'processing'}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Processing
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(order.id, 'shipped')}
                            disabled={order.status === 'shipped'}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Shipped
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(order.id, 'delivered')}
                            disabled={order.status === 'delivered'}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Delivered
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            disabled={order.status === 'cancelled'}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
