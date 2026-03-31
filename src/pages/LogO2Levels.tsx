import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHospitalsWithReadings, getStatusColor, getStatusBgColor } from '@/hooks/useO2Data';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Save, Trash2, Upload, Download } from 'lucide-react';

export default function LogO2Levels() {
  const { hospitals, refetch } = useHospitalsWithReadings();
  const [selectedHospital, setSelectedHospital] = useState('');
  const [cylinders, setCylinders] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [todayReadings, setTodayReadings] = useState<any[]>([]);

  const hospital = hospitals.find(h => h.id === selectedHospital);
  const pct = capacity > 0 ? Math.round((cylinders / capacity) * 100) : 0;
  const status = pct < 20 ? 'critical' : pct < 40 ? 'low' : 'good';

  useEffect(() => {
    if (hospital) {
      setCapacity(hospital.cylinder_capacity);
      setCylinders(hospital.latest_reading?.cylinders_available ?? hospital.cylinder_capacity);
    }
  }, [selectedHospital, hospital]);

  useEffect(() => {
    const fetchToday = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('o2_readings')
        .select('*, hospitals(name)')
        .eq('reading_date', today)
        .order('created_at', { ascending: false });
      if (data) setTodayReadings(data);
    };
    fetchToday();
  }, []);

  const handleSave = async () => {
    if (!selectedHospital) { toast.error('Select a hospital'); return; }

    const { error } = await supabase.from('o2_readings').insert({
      hospital_id: selectedHospital,
      cylinders_available: cylinders,
      cylinder_capacity: capacity,
      reading_date: date,
      logged_by: 'Operator',
      notes: notes || null,
    });

    if (error) {
      toast.error('Failed to save reading');
      return;
    }

    // Auto-create alert if critical/low
    if (pct < 20) {
      await supabase.from('alerts').insert({
        hospital_id: selectedHospital,
        alert_type: 'critical',
        message: `${hospital?.name} O₂ level CRITICAL at ${pct}% — Immediate dispatch required`,
      });
    } else if (pct < 40) {
      await supabase.from('alerts').insert({
        hospital_id: selectedHospital,
        alert_type: 'low',
        message: `${hospital?.name} O₂ level LOW at ${pct}% — Schedule delivery`,
      });
    }

    toast.success('Reading saved successfully');
    refetch();
    setNotes('');
    // Refresh today's readings
    const { data } = await supabase
      .from('o2_readings')
      .select('*, hospitals(name)')
      .eq('reading_date', format(new Date(), 'yyyy-MM-dd'))
      .order('created_at', { ascending: false });
    if (data) setTodayReadings(data);
  };

  const downloadTemplate = () => {
    const csv = 'hospital_name,cylinders_available,cylinder_capacity,reading_date,notes\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'o2_template.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single entry */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Single Hospital Entry</h2>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Hospital</label>
            <select
              value={selectedHospital}
              onChange={e => setSelectedHospital(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select hospital...</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Cylinders Available: <span className="font-mono font-bold">{cylinders}</span>
            </label>
            <input
              type="range"
              min={0}
              max={capacity}
              value={cylinders}
              onChange={e => setCylinders(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span>{capacity}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={e => setCapacity(Number(e.target.value))}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          {/* Live preview */}
          {selectedHospital && (
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-2xl font-bold font-mono', getStatusColor(status))}>{pct}%</span>
                <span className={cn('text-xs font-medium px-2 py-1 rounded', 
                  status === 'critical' ? 'bg-destructive/20 text-destructive' :
                  status === 'low' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                )}>
                  {status.toUpperCase()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted">
                <div className={cn('h-2 rounded-full transition-all', getStatusBgColor(status))} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none"
              placeholder="Optional remarks..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 gap-1.5">
              <Save size={14} /> Save Reading
            </Button>
            <Button variant="outline" onClick={() => { setSelectedHospital(''); setNotes(''); }}>
              Clear
            </Button>
          </div>
        </div>

        {/* Bulk upload */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Bulk Upload</h2>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Drag & drop CSV file here</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
            <Download size={14} /> Download CSV Template
          </Button>
        </div>
      </div>

      {/* Today's readings */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">Today's Logged Readings</h2>
        <div className="space-y-2">
          {todayReadings.length === 0 && <p className="text-xs text-muted-foreground">No readings logged today</p>}
          {todayReadings.map(r => (
            <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-2/50 text-xs">
              <span className="font-medium">{(r.hospitals as any)?.name}</span>
              <span className="font-mono">{r.cylinders_available}/{r.cylinder_capacity}</span>
              <span className={cn('font-mono font-bold px-2 py-0.5 rounded', 
                r.status === 'critical' ? 'bg-destructive/20 text-destructive' :
                r.status === 'low' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
              )}>
                {r.level_pct}%
              </span>
              <span className="text-muted-foreground">{r.created_at ? format(new Date(r.created_at), 'HH:mm') : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
