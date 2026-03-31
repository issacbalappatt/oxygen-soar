import { useAlerts, getStatusBgColor } from '@/hooks/useO2Data';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, Phone, Truck } from 'lucide-react';

type Tab = 'all' | 'critical' | 'low' | 'info';

export default function AlertCentre() {
  const { alerts, refetch } = useAlerts();
  const [tab, setTab] = useState<Tab>('all');

  const filtered = alerts.filter(a => {
    if (tab === 'all') return true;
    if (tab === 'critical') return a.alert_type === 'critical';
    if (tab === 'low') return a.alert_type === 'low';
    if (tab === 'info') return ['info', 'delivery_complete'].includes(a.alert_type);
    return true;
  });

  const markAllRead = async () => {
    await supabase.from('alerts').update({ is_read: true }).eq('is_read', false);
    toast.success('All alerts marked as read');
    refetch();
  };

  const markRead = async (id: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    refetch();
  };

  const alertDotColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-destructive';
      case 'low': return 'bg-warning';
      default: return 'bg-primary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'critical', 'low', 'info'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium',
                tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
              )}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
      </div>

      <div className="space-y-2">
        {filtered.map(alert => (
          <div
            key={alert.id}
            className={cn(
              'bg-card border border-border rounded-xl p-4 flex items-start gap-3 transition-opacity',
              alert.is_read && 'opacity-50'
            )}
          >
            <div className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', alertDotColor(alert.alert_type),
              alert.alert_type === 'critical' && !alert.is_read && 'shadow-[0_0_8px_rgba(248,113,113,0.5)]'
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded',
                  alert.alert_type === 'critical' ? 'bg-destructive/20 text-destructive' :
                  alert.alert_type === 'low' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'
                )}>
                  {alert.alert_type.toUpperCase()}
                </span>
              </div>
              <p className={cn('text-sm', alert.alert_type === 'critical' && !alert.is_read && 'font-semibold')}>{alert.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {alert.created_at ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }) : ''}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {alert.alert_type === 'critical' && !alert.is_read && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
                    <Truck size={12} /> Dispatch
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
                    <Phone size={12} /> Call
                  </Button>
                </>
              )}
              {!alert.is_read && (
                <button onClick={() => markRead(alert.id)} className="text-[10px] text-muted-foreground hover:text-foreground">
                  ✓
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
