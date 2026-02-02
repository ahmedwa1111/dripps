import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats } from '@/types';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Get total revenue and orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total, created_at')
        .neq('status', 'cancelled');
      
      if (ordersError) throw ordersError;

      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalOrders = orders?.length || 0;

      // Get products count
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      if (productsError) throw productsError;

      // Get customers count (profiles)
      const { count: customersCount, error: customersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (customersError) throw customersError;

      // Calculate changes (mock for now - would need historical data)
      const revenueChange = 12.5;
      const ordersChange = 8.2;

      return {
        totalRevenue,
        totalOrders,
        totalProducts: productsCount || 0,
        totalCustomers: customersCount || 0,
        revenueChange,
        ordersChange,
      };
    },
  });
}

export function useRecentOrders(limit = 5) {
  return useQuery({
    queryKey: ['recent-orders', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });
}

export function useOrdersByStatus() {
  return useQuery({
    queryKey: ['orders-by-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status');
      
      if (error) throw error;

      const statusCounts = {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };

      data?.forEach((order) => {
        if (order.status in statusCounts) {
          statusCounts[order.status as keyof typeof statusCounts]++;
        }
      });

      return Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    },
  });
}

export function useRevenueByMonth() {
  return useQuery({
    queryKey: ['revenue-by-month'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Group by month
      const monthlyRevenue: Record<string, number> = {};
      
      data?.forEach((order) => {
        const month = new Date(order.created_at).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(order.total);
      });

      // Return last 6 months or available data
      return Object.entries(monthlyRevenue)
        .slice(-6)
        .map(([month, revenue]) => ({
          month,
          revenue,
        }));
    },
  });
}
