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
  const { user } = useAuth();
  const { items, clearCart } = useCart();

  return useMutation({
    mutationFn: async (orderData: {
      shippingAddress: Address;
      billingAddress?: Address;
      customerEmail: string;
      customerName: string;
      notes?: string;
      paymentMethod?: "card" | "cod";
    }) => {
      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      const freeShippingThreshold = getFreeShippingThreshold();
      const baseShipping = items.reduce(
        (sum, item) => sum + item.quantity * (item.product.shipping_price ?? SHIPPING_COST),
        0
      );
      const isDoubled = itemCount > SHIPPING_DOUBLE_ITEMS_THRESHOLD;
      const computed = isDoubled ? baseShipping * 2 : baseShipping;
      const shippingCost =
        subtotal >= freeShippingThreshold ? 0 : Math.min(computed, MAX_SHIPPING_COST);
      const total = subtotal + shippingCost;
      const totalAmountCents = Math.round(total * 100);

      // Create order
      const paymentMethod = orderData.paymentMethod ?? "card";
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id ?? null,
          status: 'pending' as const,
          payment_method: paymentMethod,
          payment_status: 'unpaid',
          subtotal,
          shipping_cost: shippingCost,
          total,
          total_amount_cents: totalAmountCents,
          shipping_address: orderData.shippingAddress as unknown as any,
          billing_address: (orderData.billingAddress || orderData.shippingAddress) as unknown as any,
          customer_email: orderData.customerEmail,
          customer_name: orderData.customerName,
          notes: orderData.notes ?? null,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_image: item.product.image_url,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;

      return order;
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
