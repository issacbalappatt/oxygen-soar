import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HospitalWithReading {
  id: string;
  name: string;
  district: string;
  location: string | null;
  contact_phone: string | null;
  total_beds: number | null;
  cylinder_capacity: number;
  assigned_facility_id: string | null;
  reorder_threshold_pct: number | null;
  critical_threshold_pct: number | null;
  latitude: number | null;
  longitude: number | null;
  latest_reading?: {
    cylinders_available: number;
    cylinder_capacity: number;
    level_pct: number | null;
    status: string | null;
    reading_date: string;
    created_at: string | null;
  };
}

export function useHospitalsWithReadings() {
  const [hospitals, setHospitals] = useState<HospitalWithReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: hosp } = await supabase.from('hospitals').select('*');
    const { data: readings } = await supabase
      .from('o2_readings')
      .select('*')
      .order('reading_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (hosp) {
      const mapped: HospitalWithReading[] = hosp.map((h) => {
        const latestReading = readings?.find((r) => r.hospital_id === h.id);
        return {
          ...h,
          latest_reading: latestReading
            ? {
                cylinders_available: latestReading.cylinders_available,
                cylinder_capacity: latestReading.cylinder_capacity,
                level_pct: latestReading.level_pct,
                status: latestReading.status,
                reading_date: latestReading.reading_date,
                created_at: latestReading.created_at,
              }
            : undefined,
        };
      });
      setHospitals(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channelName = `o2-realtime-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'o2_readings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { hospitals, loading, refetch: fetchData };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*, hospitals(name, district)')
      .order('created_at', { ascending: false });
    if (data) setAlerts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const criticalCount = alerts.filter((a) => a.alert_type === 'critical' && !a.is_read).length;

  return { alerts, loading, unreadCount, criticalCount, refetch: fetchAlerts };
}

export function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'critical': return 'text-destructive';
    case 'low': return 'text-warning';
    case 'good': return 'text-success';
    default: return 'text-muted-foreground';
  }
}

export function getStatusBgColor(status: string | null | undefined): string {
  switch (status) {
    case 'critical': return 'bg-destructive';
    case 'low': return 'bg-warning';
    case 'good': return 'bg-success';
    default: return 'bg-muted';
  }
}

export function getStatusBorderColor(status: string | null | undefined): string {
  switch (status) {
    case 'critical': return 'border-l-destructive';
    case 'low': return 'border-l-warning';
    case 'good': return 'border-l-success';
    default: return 'border-l-muted';
  }
}
