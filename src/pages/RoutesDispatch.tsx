import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHospitalsWithReadings, getStatusColor } from '@/hooks/useO2Data';
import { useRouteOptimizer, OptimizedRoute } from '@/hooks/useRouteOptimizer';
import { cn } from '@/lib/utils';
import { Route as RouteIcon, RefreshCw, Plus, MapPin, Zap, Truck, Clock, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import StatCard from '@/components/StatCard';
import GoogleMap from '@/components/GoogleMap';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RoutesDispatch() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const { hospitals } = useHospitalsWithReadings();
  const { result: optimized, loading: optimizing, error: optError, optimize, reset } = useRouteOptimizer();

  // Route builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [selectedTruck, setSelectedTruck] = useState<string>('');
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [savingRoute, setSavingRoute] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [routeRes, facRes, truckRes] = await Promise.all([
        supabase
          .from('routes')
          .select('*, trucks(truck_code, driver_name), facilities(name), route_stops(*, hospitals(name, district, latitude, longitude))')
          .order('created_at', { ascending: false }),
        supabase.from('facilities').select('*'),
        supabase.from('trucks').select('*').or('status.eq.standby,status.eq.available'),
      ]);
      if (routeRes.data) setRoutes(routeRes.data);
      if (facRes.data) setFacilities(facRes.data);
      if (truckRes.data) setTrucks(truckRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const activeRoutes = routes.filter(r => r.status === 'active');
  const plannedRoutes = routes.filter(r => r.status === 'planned');
  const totalCylinders = routes.filter(r => ['active', 'planned'].includes(r.status))
    .reduce((s, r) => s + (r.total_cylinders || 0), 0);
  const totalKm = routes.filter(r => r.status === 'active').reduce((s, r) => s + (r.total_distance_km || 0), 0);

  const handleOptimize = async () => {
    if (!selectedFacility) { toast.error('Select a facility'); return; }
    if (selectedHospitals.length === 0) { toast.error('Select at least one hospital'); return; }

    const result = await optimize(selectedFacility, selectedHospitals, selectedTruck || undefined);
    if (result) {
      toast.success(`Route optimized: ${result.total_distance_km} km, ~${result.total_duration_hours}h`);
    } else if (optError) {
      toast.error(optError);
    }
  };

  const handleSaveRoute = async () => {
    if (!optimized) return;
    setSavingRoute(true);
    try {
      const routeName = `Route ${format(new Date(), 'dd-MMM')} – ${optimized.facility.name}`;
      const { data: route, error: routeErr } = await supabase
        .from('routes')
        .insert({
          route_name: routeName,
          facility_id: optimized.facility.id,
          truck_id: selectedTruck || null,
          total_distance_km: optimized.total_distance_km,
          estimated_duration_hours: optimized.total_duration_hours,
          total_cylinders: optimized.total_cylinders,
          status: 'planned',
        })
        .select()
        .single();

      if (routeErr) throw routeErr;

      const stops = optimized.stops.map((s) => ({
        route_id: route.id,
        hospital_id: s.hospital_id,
        stop_order: s.stop_order,
        cylinders_to_deliver: s.cylinders_to_deliver,
        eta: s.eta,
        status: 'pending',
      }));

      const { error: stopsErr } = await supabase.from('route_stops').insert(stops);
      if (stopsErr) throw stopsErr;

      toast.success('Route saved successfully');
      setShowBuilder(false);
      reset();
      setSelectedHospitals([]);

      // Refresh routes
      const { data } = await supabase
        .from('routes')
        .select('*, trucks(truck_code, driver_name), facilities(name), route_stops(*, hospitals(name, district, latitude, longitude))')
        .order('created_at', { ascending: false });
      if (data) setRoutes(data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save route');
    } finally {
      setSavingRoute(false);
    }
  };

  const toggleHospital = (id: string) => {
    setSelectedHospitals(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  // Map markers for optimized result
  const mapMarkers = optimized
    ? [
        { lat: optimized.facility.lat, lng: optimized.facility.lng, label: 'F', title: optimized.facility.name, color: 'blue' as const },
        ...optimized.stops.map((s, i) => {
          const hosp = hospitals.find(h => h.id === s.hospital_id);
          return {
            lat: hosp?.latitude ?? 0,
            lng: hosp?.longitude ?? 0,
            label: String(i + 1),
            title: s.hospital_name,
            color: (s.status === 'critical' ? 'red' : s.status === 'low' ? 'orange' : 'green') as 'red' | 'orange' | 'green',
          };
        }),
      ]
    : [];

  // Map markers for existing route
  const getRouteMarkers = (route: any) => {
    const markers: any[] = [];
    if (route.facilities) {
      const fac = facilities.find(f => f.id === route.facility_id);
      if (fac?.latitude && fac?.longitude) {
        markers.push({ lat: fac.latitude, lng: fac.longitude, label: 'F', title: fac.name, color: 'blue' });
      }
    }
    (route.route_stops || []).sort((a: any, b: any) => a.stop_order - b.stop_order).forEach((stop: any, i: number) => {
      if (stop.hospitals?.latitude && stop.hospitals?.longitude) {
        markers.push({
          lat: stop.hospitals.latitude,
          lng: stop.hospitals.longitude,
          label: String(i + 1),
          title: stop.hospitals.name,
          color: stop.status === 'delivered' ? 'green' : 'orange',
        });
      }
    });
    return markers;
  };

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

  const hospitalsWithCoords = hospitals.filter(h => h.latitude != null && h.longitude != null);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Routes" value={activeRoutes.length} icon={<RouteIcon size={18} />} color="success" />
        <StatCard title="Planned" value={plannedRoutes.length} icon={<MapPin size={18} />} color="warning" />
        <StatCard title="Cylinders in Transit" value={totalCylinders} icon={<RouteIcon size={18} />} color="primary" />
        <StatCard title="Total KM Today" value={totalKm} icon={<Navigation size={18} />} color="secondary" />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { setShowBuilder(!showBuilder); reset(); }}
        >
          {showBuilder ? 'Cancel' : <><Plus size={14} /> Create Optimized Route</>}
        </Button>
      </div>

      {/* Route Builder */}
      {showBuilder && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap size={16} className="text-primary" /> Route Optimizer
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Origin Facility</label>
              <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                <SelectContent>
                  {facilities.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} – {f.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Assign Truck (optional)</label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.truck_code} – {t.driver_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Select Hospitals ({selectedHospitals.length} selected)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {hospitalsWithCoords.map(h => (
                <label
                  key={h.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors',
                    selectedHospitals.includes(h.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  <Checkbox
                    checked={selectedHospitals.includes(h.id)}
                    onCheckedChange={() => toggleHospital(h.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{h.name}</span>
                    <span className="text-muted-foreground">{h.district}</span>
                  </div>
                  {h.latest_reading && (
                    <span className={cn('font-mono', getStatusColor(h.latest_reading.status))}>
                      {h.latest_reading.level_pct ?? '–'}%
                    </span>
                  )}
                </label>
              ))}
            </div>
            {hospitalsWithCoords.length === 0 && (
              <p className="text-xs text-muted-foreground">No hospitals with coordinates found. Add lat/lng to hospitals first.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleOptimize} disabled={optimizing} className="gap-1.5">
              {optimizing ? <><RefreshCw size={14} className="animate-spin" /> Optimizing…</> : <><Zap size={14} /> Optimize Route</>}
            </Button>
            {hospitalsWithCoords.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const criticalIds = hospitalsWithCoords
                    .filter(h => h.latest_reading?.status === 'critical' || h.latest_reading?.status === 'low')
                    .map(h => h.id);
                  setSelectedHospitals(criticalIds);
                }}
              >
                Select Critical/Low
              </Button>
            )}
          </div>

          {optError && (
            <p className="text-xs text-destructive">{optError}</p>
          )}

          {/* Optimized Result */}
          {optimized && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-success flex items-center gap-1.5">
                  ✓ Route Optimized
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Navigation size={12} /> {optimized.total_distance_km} km</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {optimized.total_duration_hours}h</span>
                  <span className="flex items-center gap-1"><Truck size={12} /> {optimized.total_cylinders} cyl</span>
                </div>
              </div>

              {/* Map */}
              <GoogleMap
                markers={mapMarkers}
                polylineEncoded={optimized.overview_polyline ?? undefined}
                className="h-[350px]"
              />

              {/* Stop list */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="font-medium text-primary">{optimized.facility.name} (Origin)</span>
                </div>
                {optimized.stops.map((stop, idx) => (
                  <div key={stop.hospital_id} className="flex items-center gap-2 text-xs pl-1">
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      stop.status === 'critical' ? 'bg-destructive' : stop.status === 'low' ? 'bg-warning' : 'bg-success'
                    )} />
                    <span className="font-mono text-muted-foreground w-4">{idx + 1}.</span>
                    <span className="flex-1">{stop.hospital_name}</span>
                    <span className="text-muted-foreground">{stop.district}</span>
                    <span className="font-mono text-muted-foreground">{stop.leg_distance_km}km</span>
                    <span className="font-mono">{stop.eta}</span>
                    <span className="font-mono font-medium">{stop.cylinders_to_deliver} cyl</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="font-medium text-primary">Return to {optimized.facility.name}</span>
                </div>
              </div>

              <Button size="sm" onClick={handleSaveRoute} disabled={savingRoute} className="gap-1.5">
                {savingRoute ? 'Saving…' : 'Save & Dispatch Route'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Existing Route cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routes.map(route => {
          const routeMarkers = getRouteMarkers(route);
          return (
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

              {/* Mini map for route */}
              {routeMarkers.length > 0 && (
                <GoogleMap markers={routeMarkers} className="h-[180px] mb-3" />
              )}

              {/* Stops */}
              <div className="space-y-2 mb-4">
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
          );
        })}
        {routes.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground col-span-2">No routes created yet. Use the optimizer above to create your first route.</p>
        )}
      </div>
    </div>
  );
}
