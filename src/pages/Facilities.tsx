import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/StatCard';
import { Factory, Zap, TrendingUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Facilities() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [hospitalCounts, setHospitalCounts] = useState<Record<string, number>>({});
  const [truckCounts, setTruckCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data: fac } = await supabase.from('facilities').select('*');
      const { data: hosp } = await supabase.from('hospitals').select('assigned_facility_id');
      const { data: trucks } = await supabase.from('trucks').select('assigned_facility_id');
      if (fac) setFacilities(fac);
      
      const hc: Record<string, number> = {};
      hosp?.forEach(h => { if (h.assigned_facility_id) hc[h.assigned_facility_id] = (hc[h.assigned_facility_id] || 0) + 1; });
      setHospitalCounts(hc);

      const tc: Record<string, number> = {};
      trucks?.forEach(t => { if (t.assigned_facility_id) tc[t.assigned_facility_id] = (tc[t.assigned_facility_id] || 0) + 1; });
      setTruckCounts(tc);
    };
    fetch();
  }, []);

  const totalCapacity = facilities.reduce((s, f) => s + f.daily_capacity, 0);
  // Simulated utilization
  const avgUtilisation = 72;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {facilities.map(f => {
          const util = Math.round(50 + Math.random() * 40); // Simulated
          return (
            <div key={f.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-primary text-lg">⬡</span>
                <div>
                  <h3 className="text-sm font-semibold">{f.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{f.location}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Daily Capacity</span><span className="font-mono">{f.daily_capacity} cyl/day</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Utilisation</span><span className={cn('font-mono font-bold', util > 85 ? 'text-destructive' : 'text-success')}>{util}%</span></div>
                <div className="w-full h-1.5 rounded-full bg-muted">
                  <div className={cn('h-1.5 rounded-full', util > 85 ? 'bg-destructive' : util > 60 ? 'bg-warning' : 'bg-success')} style={{ width: `${util}%` }} />
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trucks Assigned</span><span className="font-mono">{truckCounts[f.id] || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Hospitals Served</span><span className="font-mono">{hospitalCounts[f.id] || 0}</span></div>
              </div>

              {util > 85 && <p className="text-[11px] text-warning font-medium mt-2">⚠ Near capacity</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Daily Capacity" value={totalCapacity} icon={<Factory size={18} />} color="primary" subtitle="cylinders/day" />
        <StatCard title="Avg Utilisation" value={`${avgUtilisation}%`} icon={<TrendingUp size={18} />} color="success" />
        <StatCard title="Facilities" value={facilities.length} icon={<Package size={18} />} color="secondary" />
        <StatCard title="Surplus Buffer" value={`${Math.round(totalCapacity * 0.28)}`} icon={<Zap size={18} />} color="warning" subtitle="cylinders" />
      </div>
    </div>
  );
}
