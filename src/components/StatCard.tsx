import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'primary' | 'destructive' | 'success' | 'secondary' | 'warning';
  subtitle?: string;
}

const colorMap = {
  primary: 'text-primary',
  destructive: 'text-destructive',
  success: 'text-success',
  secondary: 'text-secondary',
  warning: 'text-warning',
};

const bgMap = {
  primary: 'bg-primary/10',
  destructive: 'bg-destructive/10',
  success: 'bg-success/10',
  secondary: 'bg-secondary/10',
  warning: 'bg-warning/10',
};

export default function StatCard({ title, value, icon, color = 'primary', subtitle }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className={cn('p-2 rounded-lg', bgMap[color])}>
          <div className={colorMap[color]}>{icon}</div>
        </div>
      </div>
      <p className={cn('text-2xl font-bold font-mono', colorMap[color])}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
