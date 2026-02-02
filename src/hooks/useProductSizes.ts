import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductSize } from '@/types';
import { toast } from 'sonner';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

export function useProductSizes(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-sizes', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Normalize stock to number (Postgres may return as string in some clients)
      const normalized = (data as ProductSize[]).map((row) => ({
        ...row,
        stock: Number(row.stock),
      }));
      // Sort by size order
      return normalized.sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a.size);
        const indexB = SIZE_ORDER.indexOf(b.size);
        if (indexA === -1 && indexB === -1) return a.size.localeCompare(b.size);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    },
    enabled: !!productId,
  });
}

export function useUpdateProductSize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stock,
      is_enabled,
    }: {
      id: string;
      stock?: number;
      is_enabled?: boolean;
    }) => {
      const updates: Partial<ProductSize> = {};
      if (stock !== undefined) updates.stock = stock;
      if (is_enabled !== undefined) updates.is_enabled = is_enabled;

      const { data, error } = await supabase
        .from('product_sizes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', data.product_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Size updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update size: ' + error.message);
    },
  });
}

export function useBulkUpdateProductSizes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      sizes,
    }: {
      productId: string;
      sizes: { size: string; stock: number; is_enabled: boolean }[];
    }) => {
      // Upsert all sizes
      const { error } = await supabase
        .from('product_sizes')
        .upsert(
          sizes.map((s) => ({
            product_id: productId,
            size: s.size,
            stock: s.stock,
            is_enabled: s.is_enabled,
          })),
          { onConflict: 'product_id,size' }
        );

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Sizes updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update sizes: ' + error.message);
    },
  });
}

export function useInitializeProductSizes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const defaultSizes = SIZE_ORDER.slice(0, 5).map((size) => ({
        product_id: productId,
        size,
        stock: 0,
        is_enabled: true,
      }));

      const { error } = await supabase
        .from('product_sizes')
        .upsert(defaultSizes, { onConflict: 'product_id,size' });

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', productId] });
    },
  });
}
