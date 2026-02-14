import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCoupons, useDeleteCoupon, useToggleCoupon } from '@/hooks/useCoupons';
import { CouponForm } from '@/components/admin/CouponForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { Copy, MoreHorizontal, Plus, Trash2, ToggleLeft, ToggleRight, Eye, Pencil } from 'lucide-react';
import type { Coupon } from '@/types';

export default function AdminCouponsPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [sort, setSort] = useState<'created_at' | 'used_count'>('created_at');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [duplicateCoupon, setDuplicateCoupon] = useState<Coupon | null>(null);
  const [deleteCoupon, setDeleteCoupon] = useState<Coupon | null>(null);

  const { data: coupons = [], isLoading } = useCoupons({
    search: search || undefined,
    sort,
    direction,
  });
  const toggleCoupon = useToggleCoupon();
  const deleteCouponMutation = useDeleteCoupon();

  const now = new Date();
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (statusFilter === 'inactive') return !coupon.is_active;
      if (statusFilter === 'expired') {
        return coupon.expires_at ? new Date(coupon.expires_at) < now : false;
      }
      if (statusFilter === 'active') {
        const notExpired = coupon.expires_at ? new Date(coupon.expires_at) >= now : true;
        return coupon.is_active && notExpired;
      }
      return true;
    });
  }, [coupons, statusFilter, now]);

  const openCreate = () => {
    setEditCoupon(null);
    setDuplicateCoupon(null);
    setCreateDialogOpen(true);
  };

  const handleDuplicate = (coupon: Coupon) => {
    setEditCoupon(null);
    setDuplicateCoupon({
      ...coupon,
      code: `${coupon.code}-COPY`,
    });
    setCreateDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteCoupon) return;
    deleteCouponMutation.mutate(deleteCoupon.id);
    setDeleteCoupon(null);
  };

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground">
          You need an admin account to manage coupons.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Coupons</h1>
            <p className="text-muted-foreground">Create and track discount coupons.</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Coupon
          </Button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Select value={sort} onValueChange={(value) => setSort(value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created date</SelectItem>
                <SelectItem value="used_count">Usage count</SelectItem>
              </SelectContent>
            </Select>
            <Select value={direction} onValueChange={(value) => setDirection(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredCoupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No coupons found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoupons.map((coupon) => {
                    const expired = coupon.expires_at ? new Date(coupon.expires_at) < now : false;
                    const statusLabel = expired ? 'Expired' : coupon.is_active ? 'Active' : 'Inactive';
                    const statusVariant = expired ? 'secondary' : coupon.is_active ? 'default' : 'secondary';
                    const usageLabel = coupon.usage_limit_total
                      ? `${coupon.used_count} / ${coupon.usage_limit_total}`
                      : `${coupon.used_count}`;

                    return (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-medium">{coupon.code}</TableCell>
                        <TableCell className="capitalize">{coupon.type}</TableCell>
                        <TableCell>
                          {coupon.type === 'percentage'
                            ? `${coupon.value}%`
                            : formatCurrency(Number(coupon.value))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell>{usageLabel}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {coupon.starts_at ? format(new Date(coupon.starts_at), 'MMM d, yyyy') : 'Anytime'}
                          {coupon.expires_at ? ` – ${format(new Date(coupon.expires_at), 'MMM d, yyyy')}` : ''}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditCoupon(coupon)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(coupon)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleCoupon.mutate(coupon.id)}>
                                {coupon.is_active ? (
                                  <>
                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/coupons/${coupon.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Usage
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteCoupon(coupon)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) setDuplicateCoupon(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
          </DialogHeader>
          <CouponForm
            coupon={duplicateCoupon ?? undefined}
            mode="create"
            onSuccess={() => { setCreateDialogOpen(false); setDuplicateCoupon(null); }}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCoupon} onOpenChange={(open) => !open && setEditCoupon(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
          </DialogHeader>
          {editCoupon && (
            <CouponForm
              coupon={editCoupon}
              mode="edit"
              onSuccess={() => setEditCoupon(null)}
              onCancel={() => setEditCoupon(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCoupon} onOpenChange={(open) => !open && setDeleteCoupon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the coupon and prevent further use. You can create a new one later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}



