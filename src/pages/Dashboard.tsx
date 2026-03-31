import { useEffect, useState } from 'react';
import { Building2, AlertTriangle, Truck, Cylinder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHospitalsWithReadings, useAlerts, getStatusColor, getStatusBgColor } from '@/hooks/useO2Data';
import StatCard from '@/components/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { hospitals } = useHospitalsWithReadings();
  const { alerts } = useAlerts();
  const [deliveriesToday, setDeliveriesToday] = useState(0);
  const [cylindersDeployed, setCylindersDeployed] = useState(0);

  useEffect(() => {
    const fetchDeliveries = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('deliveries')
        .select('cylinders_delivered')
        .gte('delivered_at', today);
      if (data) {
        setDeliveriesToday(data.length);
        setCylindersDeployed(data.reduce((sum, d) => sum + d.cylinders_delivered, 0));
      }
    };
    fetchDeliveries();
  }, []);

  const criticalHospitals = hospitals.filter(h => h.latest_reading?.status === 'critical');
  const recentAlerts = alerts.filter(a => !a.is_read).slice(0, 8);

  // District chart data
  const districtMap: Record<string, { total: number; count: number }> = {};
  hospitals.forEach(h => {
    const pct = h.latest_reading?.level_pct ?? 0;
    if (!districtMap[h.district]) districtMap[h.district] = { total: 0, count: 0 };
    districtMap[h.district].total += pct;
    districtMap[h.district].count += 1;
  });
  const districtData = Object.entries(districtMap).map(([name, d]) => ({
    name,
    avg: Math.round(d.total / d.count),
    status: d.total / d.count < 20 ? 'critical' : d.total / d.count < 40 ? 'low' : 'good',
  }));

  const barColors: Record<string, string> = { critical: '#f87171', low: '#fbbf24', good: '#34d399' };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Hospitals Monitored" value={hospitals.length} icon={<Building2 size={18} />} color="primary" />
        <StatCard title="Critical Now" value={criticalHospitals.length} icon={<AlertTriangle size={18} />} color="destructive" />
        <StatCard title="Deliveries Today" value={deliveriesToday} icon={<Truck size={18} />} color="success" />
        <StatCard title="Cylinders Deployed" value={cylindersDeployed} icon={<Cylinder size={18} />} color="secondary" />
      </div>

      {/* Kerala Map placeholder + alerts/chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 min-h-[400px]">
          <h2 className="text-sm font-semibold mb-4">Kerala O₂ Network Map</h2>
          <div className="relative w-full h-[350px]">
            {/* Simplified Kerala SVG */}
            <svg viewBox="0 0 200 500" className="w-full h-full opacity-20">
              <path
                d="M100,10 C60,30 40,80 35,120 C30,160 45,200 40,240 C35,280 25,320 30,360 C35,400 50,430 70,460 C80,475 90,485 100,490 C110,485 120,475 130,460 C150,430 165,400 170,360 C175,320 165,280 160,240 C155,200 170,160 165,120 C160,80 140,30 100,10Z"
                fill="hsl(var(--surface-2))"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
              />
            </svg>
            {/* Hospital dots positioned on the map */}
            {hospitals.map((h) => {
              if (!h.latitude || !h.longitude) return null;
              const x = ((h.longitude - 75.0) / 3.0) * 100;
              const y = ((12.5 - h.latitude) / 5.0) * 100;
              const status = h.latest_reading?.status;
              const dotColor = status === 'critical' ? '#f87171' : status === 'low' ? '#fbbf24' : '#34d399';
              return (
                <div
                  key={h.id}
                  className="absolute group"
                  style={{ left: `${Math.max(10, Math.min(90, x))}%`, top: `${Math.max(5, Math.min(90, y))}%` }}
                >
                  {status === 'critical' && (
                    <div className="absolute inset-0 w-4 h-4 -ml-2 -mt-2 rounded-full animate-pulse-ring" style={{ backgroundColor: dotColor, opacity: 0.3 }} />
                  )}
                  <div className="w-3 h-3 rounded-full border-2 border-background" style={{ backgroundColor: dotColor }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-lg px-3 py-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <p className="font-semibold">{h.name}</p>
                    <p className={cn('font-mono', getStatusColor(status))}>{h.latest_reading?.level_pct ?? 0}%</p>
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div className="absolute top-2 right-2 bg-card/90 border border-border rounded-lg p-2 text-[10px] space-y-1">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive" /> Critical</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning" /> Low</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /> Good</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> Facility</div>
            </div>
          </div>
        </div>

        {/* Alert feed */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-3">Live Alert Feed</h2>
          <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin">
            {recentAlerts.length === 0 && <p className="text-xs text-muted-foreground">No active alerts</p>}
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-2/50">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', getStatusBgColor(alert.alert_type === 'critical' ? 'critical' : alert.alert_type === 'low' ? 'low' : 'good'))} />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-tight">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {alert.created_at ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">District O₂ Availability</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={districtData}>
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(99,179,237,0.12)', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="avg" radius={[6, 6, 0, 0]} name="Avg Level %">
              {districtData.map((entry, i) => (
                <Cell key={i} fill={barColors[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
