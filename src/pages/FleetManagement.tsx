import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const statusStyles: Record<string, string> = {
  en_route: 'bg-success/20 text-success',
  loading: 'bg-warning/20 text-warning',
  maintenance: 'bg-destructive/20 text-destructive',
  standby: 'bg-muted text-muted-foreground',
};

export default function FleetManagement() {
  const [trucks, setTrucks] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('trucks').select('*, facilities(name)');
      if (data) setTrucks(data);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5"><Plus size={14} /> Add Vehicle</Button>
      </div>

      {/* Truck cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {trucks.map(t => {
          const cargoPercent = Math.round(Math.random() * 80 + 10); // Simulated current load
          return (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary font-mono text-sm font-bold">{t.truck_code}</span>
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded', statusStyles[t.status])}>
                  {t.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-xs mb-2">{t.driver_name}</p>
              <div className="w-full h-1.5 rounded-full bg-muted mb-1">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${cargoPercent}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">{Math.round(t.cylinder_capacity * cargoPercent / 100)}/{t.cylinder_capacity} cyl</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3">Truck ID</th>
              <th className="text-left p-3">Driver</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Facility</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(t => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-surface-2/30">
                <td className="p-3 font-mono text-primary">{t.truck_code}</td>
                <td className="p-3">{t.driver_name}</td>
                <td className="p-3 text-muted-foreground">{t.driver_phone}</td>
                <td className="p-3">
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded', statusStyles[t.status])}>
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{t.current_location}</td>
                <td className="p-3 text-muted-foreground">{(t.facilities as any)?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
