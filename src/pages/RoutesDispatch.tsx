import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHospitalsWithReadings, getStatusColor, getStatusBgColor } from '@/hooks/useO2Data';
import { cn } from '@/lib/utils';
import { Route as RouteIcon, RefreshCw, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import { format } from 'date-fns';

export default function RoutesDispatch() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { hospitals } = useHospitalsWithReadings();

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data } = await supabase
        .from('routes')
        .select('*, trucks(truck_code, driver_name), facilities(name), route_stops(*, hospitals(name, district))')
        .order('created_at', { ascending: false });
      if (data) setRoutes(data);
      setLoading(false);
    };
    fetchRoutes();
  }, []);

  const activeRoutes = routes.filter(r => r.status === 'active');
  const plannedRoutes = routes.filter(r => r.status === 'planned');
  const totalCylinders = routes.filter(r => ['active', 'planned'].includes(r.status))
    .reduce((s, r) => s + (r.total_cylinders || 0), 0);
  const totalKm = routes.filter(r => r.status === 'active').reduce((s, r) => s + (r.total_distance_km || 0), 0);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'text-success',
      planned: 'text-warning',
      completed: 'text-muted-foreground',
      cancelled: 'text-destructive',
    };
    const dotMap: Record<string, string> = {
      active: '●',
      planned: '◌',
      completed: '✓',
      cancelled: '✗',
    };
    return <span className={cn('text-xs font-medium', map[status])}>{dotMap[status]} {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Routes" value={activeRoutes.length} icon={<RouteIcon size={18} />} color="success" />
        <StatCard title="Planned" value={plannedRoutes.length} icon={<MapPin size={18} />} color="warning" />
        <StatCard title="Cylinders in Transit" value={totalCylinders} icon={<RouteIcon size={18} />} color="primary" />
        <StatCard title="Total KM Today" value={totalKm} icon={<RouteIcon size={18} />} color="secondary" />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw size={14} /> Re-optimise Routes
        </Button>
        <Button size="sm" className="gap-1.5">
          <Plus size={14} /> Create Route
        </Button>
      </div>

      {/* Route cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routes.map(route => (
          <div key={route.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">{route.route_name}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {route.trucks?.truck_code} · {route.facilities?.name}
                </p>
              </div>
              {statusBadge(route.status)}
            </div>

            {/* Stops */}
            <div className="space-y-2 mb-4">
              {/* Origin */}
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-primary font-medium">{route.facilities?.name} (Origin)</span>
              </div>
              {(route.route_stops || [])
                .sort((a: any, b: any) => a.stop_order - b.stop_order)
                .map((stop: any) => (
                  <div key={stop.id} className="flex items-center gap-2 text-xs pl-1">
                    <div className={cn('w-2 h-2 rounded-full', stop.status === 'delivered' ? 'bg-success' : 'bg-muted-foreground')} />
                    <span className="flex-1">{stop.hospitals?.name}</span>
                    <span className="text-muted-foreground font-mono">{stop.eta}</span>
                    <span className="font-mono">{stop.cylinders_to_deliver} cyl</span>
                    {stop.status === 'delivered' && <span className="text-success">✓</span>}
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-3">
              <span>{route.total_distance_km} km · ~{route.estimated_duration_hours}h</span>
              <span>{route.total_cylinders} cylinders</span>
            </div>
          </div>
        ))}
        {routes.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground col-span-2">No routes created yet.</p>
        )}
      </div>
    </div>
  );
}
