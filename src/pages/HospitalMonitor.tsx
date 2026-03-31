import { useState } from 'react';
import { useHospitalsWithReadings, getStatusColor, getStatusBorderColor, getStatusBgColor } from '@/hooks/useO2Data';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ArrowUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useEffect } from 'react';

type SortKey = 'level_asc' | 'level_desc' | 'district' | 'name' | 'updated';
type FilterStatus = 'all' | 'critical' | 'low' | 'good';

export default function HospitalMonitor() {
  const { hospitals } = useHospitalsWithReadings();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortKey>('level_asc');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const districts = [...new Set(hospitals.map(h => h.district))].sort();

  let filtered = hospitals.filter(h => {
    if (filter !== 'all' && h.latest_reading?.status !== filter) return false;
    if (districtFilter !== 'all' && h.district !== districtFilter) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const aLvl = a.latest_reading?.level_pct ?? 100;
    const bLvl = b.latest_reading?.level_pct ?? 100;
    switch (sort) {
      case 'level_asc': return aLvl - bLvl;
      case 'level_desc': return bLvl - aLvl;
      case 'district': return a.district.localeCompare(b.district);
      case 'name': return a.name.localeCompare(b.name);
      case 'updated': return (b.latest_reading?.created_at ?? '').localeCompare(a.latest_reading?.created_at ?? '');
      default: return 0;
    }
  });

  useEffect(() => {
    if (!selectedHospital) return;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('o2_readings')
        .select('*')
        .eq('hospital_id', selectedHospital)
        .order('reading_date', { ascending: true })
        .limit(14);
      if (data) setHistoryData(data.map(d => ({
        date: format(new Date(d.reading_date), 'MMM d'),
        level: d.level_pct,
      })));
    };
    fetchHistory();
  }, [selectedHospital]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'level_asc', label: 'Level ↑' },
    { key: 'level_desc', label: 'Level ↓' },
    { key: 'district', label: 'District' },
    { key: 'name', label: 'Name' },
    { key: 'updated', label: 'Updated' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['all', 'critical', 'low', 'good'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === f ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <select
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
            className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs"
          >
            <option value="all">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs"
          >
            {sortOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <Button size="sm" onClick={() => navigate('/log')} className="gap-1.5">
            <Plus size={14} /> Log Level
          </Button>
        </div>
      </div>

      {/* Hospital grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(h => {
          const r = h.latest_reading;
          const pct = r?.level_pct ?? 0;
          const status = r?.status ?? 'good';
          return (
            <div
              key={h.id}
              onClick={() => setSelectedHospital(h.id)}
              className={cn(
                'bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors border-l-4',
                getStatusBorderColor(status)
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{h.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{h.district} · {h.total_beds} beds</p>
                </div>
                <span className={cn('text-2xl font-bold font-mono', getStatusColor(status))}>{pct}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-muted mb-2">
                <div
                  className={cn('h-2 rounded-full transition-all', getStatusBgColor(status))}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono">{r?.cylinders_available ?? 0} / {h.cylinder_capacity} cylinders</span>
                <span>{r?.created_at ? format(new Date(r.created_at), 'HH:mm') : 'N/A'}</span>
              </div>

              {status === 'critical' && (
                <p className="text-[11px] text-destructive font-bold mt-2">⚠ DISPATCH NOW</p>
              )}
              {status === 'low' && (
                <p className="text-[11px] text-warning font-medium mt-2">▼ Order soon</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Slide-over panel */}
      {selectedHospital && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border z-50 shadow-2xl p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">
              {hospitals.find(h => h.id === selectedHospital)?.name}
            </h3>
            <button onClick={() => setSelectedHospital(null)}>
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Last 14 readings</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(99,179,237,0.12)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="level" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
