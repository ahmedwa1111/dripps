import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, change, icon: Icon, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="font-display text-3xl font-bold mt-2">{value}</p>
          {change !== undefined && (
            <p
              className={cn(
                'text-sm mt-2 flex items-center gap-1',
                change >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              <span>{change >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(change)}% from last month</span>
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg bg-muted', iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
