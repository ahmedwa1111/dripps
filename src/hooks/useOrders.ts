import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, Address } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getFreeShippingThreshold, SHIPPING_COST, SHIPPING_DOUBLE_ITEMS_THRESHOLD, MAX_SHIPPING_COST } from '@/lib/utils';

// Helper to parse address from JSON
const parseAddress = (json: unknown): Address | null => {
  if (!json || typeof json !== 'object') return null;
  return json as Address;
};

// Helper to transform database order to typed Order
const transformOrder = (dbOrder: any): Order => ({
  ...dbOrder,
  shipping_address: parseAddress(dbOrder.shipping_address),
  billing_address: parseAddress(dbOrder.billing_address),
});

export function useOrders(options?: { status?: OrderStatus; userId?: string }) {
  const { isStaff } = useAuth();

  return useQuery({
    queryKey: ['orders', options],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(transformOrder);
    },
    enabled: isStaff || !!options?.userId,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);
      
      if (itemsError) throw itemsError;

      return { ...transformOrder(order), items };
    },
    enabled: !!id,
  });
}

export function useUserOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(transformOrder);
    },
    enabled: !!user,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const { items, clearCart } = useCart();

  return useMutation({
    mutationFn: async (orderData: {
      shippingAddress: Address;
      billingAddress?: Address;
      customerEmail: string;
      customerName: string;
      notes?: string;
      paymentMethod?: "card" | "cod";
      paymentStatus?: "paid" | "unpaid";
      transactionId?: string | null;
      paidAt?: string | null;
      orderId?: string;
      shippingCost?: number;
      couponCode?: string | null;
      items?: Array<{ product_id: string; quantity: number }>;
    }) => {
      const payloadItems =
        orderData.items ??
        items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        }));

      const fallbackShippingCost = (() => {
        if (orderData.shippingCost != null) return orderData.shippingCost;
        const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const freeShippingThreshold = getFreeShippingThreshold();
        const baseShipping = items.reduce(
          (sum, item) => sum + item.quantity * (item.product.shipping_price ?? SHIPPING_COST),
          0
        );
        const isDoubled = itemCount > SHIPPING_DOUBLE_ITEMS_THRESHOLD;
        const computed = isDoubled ? baseShipping * 2 : baseShipping;
        return subtotal >= freeShippingThreshold ? 0 : Math.min(computed, MAX_SHIPPING_COST);
      })();

      const resp = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          orderId: orderData.orderId,
          customerEmail: orderData.customerEmail,
          customerName: orderData.customerName,
          notes: orderData.notes ?? null,
          shippingAddress: orderData.shippingAddress,
          billingAddress: orderData.billingAddress || orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod ?? 'card',
          paymentStatus: orderData.paymentStatus ?? 'unpaid',
          transactionId: orderData.transactionId ?? null,
          paidAt: orderData.paidAt ?? null,
          shippingCost: fallbackShippingCost,
          couponCode: orderData.couponCode ?? null,
          items: payloadItems,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to create order');
      }

      return data;
    },
    onSuccess: () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      toast.success('Order placed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to place order: ' + error.message);
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: OrderStatus; notes?: string | null }) => {
      const updatePayload: { status: OrderStatus; notes?: string | null } = { status };
      if (notes !== undefined) {
        updatePayload.notes = notes;
      }
      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order status updated');
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });
}
