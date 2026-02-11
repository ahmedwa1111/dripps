import { LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Wallet } from 'lucide-react';

export type PermissionNavItem = {
  keys: string[];
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PERMISSION_NAV_ITEMS: PermissionNavItem[] = [
  { keys: ['orders.read', 'orders.review', 'orders.process'], label: 'Orders', href: '#orders', icon: ShoppingCart },
  { keys: ['products.read'], label: 'Products', href: '#products', icon: Package },
  { keys: ['customers.read'], label: 'Customers', href: '#customers', icon: Users },
  { keys: ['reports.read'], label: 'Reports', href: '#reports', icon: BarChart3 },
  { keys: ['payroll.read'], label: 'My Payroll', href: '#payroll', icon: Wallet },
];

export const buildModeratorNav = (permissions: string[]) => {
  const items: PermissionNavItem[] = [
    { key: 'overview', label: 'Overview', href: '#overview', icon: LayoutDashboard },
  ];

  PERMISSION_NAV_ITEMS.forEach((item) => {
    if (item.keys.some((key) => permissions.includes(key))) {
      items.push(item);
    }
  });

  return items;
};
