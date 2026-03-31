import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function DeliveryHistory() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const perPage = 25;

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('*, hospitals(name, district), trucks(truck_code, driver_name)')
        .order('delivered_at', { ascending: false })
        .range(page * perPage, (page + 1) * perPage - 1);
      if (data) setDeliveries(data);
    };
    fetch();
  }, [page]);

  const exportCSV = () => {
    const headers = 'Date,Hospital,District,Cylinders,Level Before,Level After,Truck,Driver,Notes\n';
    const rows = deliveries.map(d =>
      `${d.delivered_at},${(d.hospitals as any)?.name},${(d.hospitals as any)?.district},${d.cylinders_delivered},${d.level_before_pct}%,${d.level_after_pct}%,${(d.trucks as any)?.truck_code},${(d.trucks as any)?.driver_name},${d.notes || ''}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delivery_history.csv';
    a.click();
  };

  const pctColor = (pct: number | null) => {
    if (!pct) return 'text-muted-foreground';
    if (pct < 20) return 'text-destructive';
    if (pct < 40) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Hospital</th>
              <th className="text-left p-3">District</th>
              <th className="text-left p-3">Cylinders</th>
              <th className="text-left p-3">Before</th>
              <th className="text-left p-3">After</th>
              <th className="text-left p-3">Truck</th>
              <th className="text-left p-3">Driver</th>
              <th className="text-left p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map(d => (
              <tr key={d.id} className="border-b border-border/50 hover:bg-surface-2/30">
                <td className="p-3 text-muted-foreground">{d.delivered_at ? format(new Date(d.delivered_at), 'MMM d, HH:mm') : ''}</td>
                <td className="p-3 font-medium">{(d.hospitals as any)?.name}</td>
                <td className="p-3 text-muted-foreground">{(d.hospitals as any)?.district}</td>
                <td className="p-3 font-mono">{d.cylinders_delivered}</td>
                <td className={cn('p-3 font-mono', pctColor(d.level_before_pct))}>{d.level_before_pct}%</td>
                <td className={cn('p-3 font-mono', pctColor(d.level_after_pct))}>{d.level_after_pct}%</td>
                <td className="p-3 font-mono text-primary">{(d.trucks as any)?.truck_code}</td>
                <td className="p-3">{(d.trucks as any)?.driver_name}</td>
                <td className="p-3 text-muted-foreground">{d.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
        <span className="text-xs text-muted-foreground py-2">Page {page + 1}</span>
        <Button variant="outline" size="sm" disabled={deliveries.length < perPage} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
