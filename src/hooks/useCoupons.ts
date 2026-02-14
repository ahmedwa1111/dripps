import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Coupon, CouponRedemption } from '@/types';

const parseResponse = async (resp: Response) => {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const getErrorMessage = (resp: Response, data: any, fallback: string) => {
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  return resp.status ? `HTTP ${resp.status} ${resp.statusText}`.trim() || fallback : fallback;
};

export function useCoupons(params?: { search?: string; sort?: string; direction?: 'asc' | 'desc' }) {
  const { session, isAdmin } = useAuth();
  const token = session?.access_token;

  return useQuery({
    queryKey: ['admin-coupons', params],
    queryFn: async () => {
      if (!token) throw new Error('Missing admin session');
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.sort) query.set('sort', params.sort);
      if (params?.direction) query.set('direction', params.direction);

      const resp = await fetch(`/api/admin/coupons?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await parseResponse(resp);
      if (!resp.ok) {
        throw new Error(getErrorMessage(resp, data, 'Failed to load coupons'));
      }

      return (data?.coupons || []) as Coupon[];
    },
    enabled: isAdmin && !!token,
  });
}

export function useCoupon(id?: string) {
  const { session, isAdmin } = useAuth();
  const token = session?.access_token;

  return useQuery({
    queryKey: ['admin-coupon', id],
    queryFn: async () => {
      if (!token || !id) throw new Error('Missing admin session');
      const resp = await fetch(`/api/admin/coupons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseResponse(resp);
      if (!resp.ok) {
        throw new Error(getErrorMessage(resp, data, 'Failed to load coupon'));
      }
      return data as Coupon;
    },
    enabled: isAdmin && !!token && !!id,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token;

  return useMutation({
    mutationFn: async (payload: Partial<Coupon>) => {
      if (!token) throw new Error('Missing admin session');
      const resp = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await parseResponse(resp);
      if (!resp.ok) {
        throw new Error(getErrorMessage(resp, data, 'Failed to create coupon'));
      }
      return data as Coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create coupon');
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token;

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Coupon> & { id: string }) => {
      if (!token) throw new Error('Missing admin session');
      const resp = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await parseResponse(resp);
      if (!resp.ok) {
        throw new Error(getErrorMessage(resp, data, 'Failed to update coupon'));
      }
      return data as Coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update coupon');
    },
  });
}

export function useToggleCoupon() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error('Missing admin session');
      const resp = await fetch(`/api/admin/coupons/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseResponse(resp);
      if (!resp.ok) {
        throw new Error(getErrorMessage(resp, data, 'Failed to toggle coupon'));
      }
      return data as Coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon status updated');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update coupon');
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error('Missing admin session');
      const resp = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseResponse(resp);
      if (!resp.ok) {
        throw new Error(getErrorMessage(resp, data, 'Failed to delete coupon'));
      }
      return data as Coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete coupon');
    },
  });
}

export function useCouponRedemptions(couponId?: string) {
  const { session, isAdmin } = useAuth();
  const token = session?.access_token;

  return useQuery({
    queryKey: ['coupon-redemptions', couponId],
    queryFn: async () => {
      if (!token || !couponId) throw new Error('Missing admin session');
      const resp = await fetch(`/api/admin/coupons/${couponId}/redemptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseResponse(resp);
      if (!resp.ok) {
        throw new Error(getErrorMessage(resp, data, 'Failed to load redemptions'));
      }
      return (data?.redemptions || []) as CouponRedemption[];
    },
    enabled: isAdmin && !!token && !!couponId,
  });
}
