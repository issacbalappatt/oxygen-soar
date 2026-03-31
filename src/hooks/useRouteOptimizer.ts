import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedStop {
  hospital_id: string;
  hospital_name: string;
  district: string;
  stop_order: number;
  cylinders_to_deliver: number;
  eta: string;
  leg_distance_km: number;
  leg_duration_min: number;
  current_level_pct: number | null;
  status: string | null;
}

export interface OptimizedRoute {
  optimized: boolean;
  facility: { id: string; name: string; lat: number; lng: number };
  total_distance_km: number;
  total_duration_hours: number;
  total_cylinders: number;
  stops: OptimizedStop[];
  overview_polyline: string | null;
  waypoint_order: number[];
}

export function useRouteOptimizer() {
  const [result, setResult] = useState<OptimizedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimize = async (
    facility_id: string,
    hospital_ids: string[],
    truck_id?: string,
    route_name?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'optimize-route',
        {
          body: { facility_id, hospital_ids, truck_id, route_name },
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data as OptimizedRoute);
      return data as OptimizedRoute;
    } catch (e: any) {
      const msg = e.message || 'Route optimization failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { result, loading, error, optimize, reset };
}
