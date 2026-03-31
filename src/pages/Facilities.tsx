import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/StatCard';
import { Factory, Zap, TrendingUp, Package, Pencil, Plus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Facility {
  id: string;
  name: string;
  location: string;
  daily_capacity: number;
  latitude: number | null;
  longitude: number | null;
}

interface ProductionLog {
  id: string;
  facility_id: string;
  production_date: string;
  cylinders_produced: number;
  cylinders_in_stock: number;
  cylinders_dispatched: number;
  notes: string | null;
  logged_by: string | null;
  created_at: string | null;
}

export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [hospitalCounts, setHospitalCounts] = useState<Record<string, number>>({});
  const [truckCounts, setTruckCounts] = useState<Record<string, number>>({});
  const [latestProduction, setLatestProduction] = useState<Record<string, ProductionLog>>({});
  const [productionHistory, setProductionHistory] = useState<ProductionLog[]>([]);

  // Edit facility state
  const [editOpen, setEditOpen] = useState(false);
  const [editFacility, setEditFacility] = useState<Facility | null>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', daily_capacity: 0, latitude: '', longitude: '' });

  // Add facility state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', location: '', daily_capacity: 0, latitude: '', longitude: '' });

  // Log production state
  const [logOpen, setLogOpen] = useState(false);
  const [logFacilityId, setLogFacilityId] = useState('');
  const [logForm, setLogForm] = useState({ cylinders_produced: 0, cylinders_in_stock: 0, cylinders_dispatched: 0, notes: '', logged_by: '' });

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFacilityName, setHistoryFacilityName] = useState('');

  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: fac }, { data: hosp }, { data: trucks }, { data: prod }] = await Promise.all([
      supabase.from('facilities').select('*'),
      supabase.from('hospitals').select('assigned_facility_id'),
      supabase.from('trucks').select('assigned_facility_id'),
      supabase.from('facility_production').select('*').order('production_date', { ascending: false }),
    ]);
    if (fac) setFacilities(fac);

    const hc: Record<string, number> = {};
    hosp?.forEach(h => { if (h.assigned_facility_id) hc[h.assigned_facility_id] = (hc[h.assigned_facility_id] || 0) + 1; });
    setHospitalCounts(hc);

    const tc: Record<string, number> = {};
    trucks?.forEach(t => { if (t.assigned_facility_id) tc[t.assigned_facility_id] = (tc[t.assigned_facility_id] || 0) + 1; });
    setTruckCounts(tc);

    // Get latest production per facility
    const latest: Record<string, ProductionLog> = {};
    prod?.forEach(p => {
      if (!latest[p.facility_id]) latest[p.facility_id] = p;
    });
    setLatestProduction(latest);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Edit Facility ---
  const openEdit = (f: Facility) => {
    setEditFacility(f);
    setEditForm({ name: f.name, location: f.location, daily_capacity: f.daily_capacity, latitude: f.latitude?.toString() || '', longitude: f.longitude?.toString() || '' });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editFacility) return;
    setSaving(true);
    const { error } = await supabase.from('facilities').update({
      name: editForm.name.trim(),
      location: editForm.location.trim(),
      daily_capacity: editForm.daily_capacity,
      latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
      longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
    }).eq('id', editFacility.id);
    setSaving(false);
    if (error) { toast.error('Update failed: ' + error.message); return; }
    toast.success('Facility updated');
    setEditOpen(false);
    fetchData();
  };

  // --- Add Facility ---
  const saveAdd = async () => {
    if (!addForm.name.trim() || !addForm.location.trim() || addForm.daily_capacity <= 0) {
      toast.error('Please fill in all required fields'); return;
    }
    setSaving(true);
    const { error } = await supabase.from('facilities').insert({
      name: addForm.name.trim(),
      location: addForm.location.trim(),
      daily_capacity: addForm.daily_capacity,
      latitude: addForm.latitude ? parseFloat(addForm.latitude) : null,
      longitude: addForm.longitude ? parseFloat(addForm.longitude) : null,
    });
    setSaving(false);
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success('Facility added');
    setAddOpen(false);
    setAddForm({ name: '', location: '', daily_capacity: 0, latitude: '', longitude: '' });
    fetchData();
  };

  // --- Log Production ---
  const openLog = (facilityId: string) => {
    setLogFacilityId(facilityId);
    const prev = latestProduction[facilityId];
    setLogForm({
      cylinders_produced: 0,
      cylinders_in_stock: prev?.cylinders_in_stock || 0,
      cylinders_dispatched: 0,
      notes: '',
      logged_by: '',
    });
    setLogOpen(true);
  };

  const saveLog = async () => {
    setSaving(true);
    const { error } = await supabase.from('facility_production').insert({
      facility_id: logFacilityId,
      cylinders_produced: logForm.cylinders_produced,
      cylinders_in_stock: logForm.cylinders_in_stock,
      cylinders_dispatched: logForm.cylinders_dispatched,
      notes: logForm.notes.trim() || null,
      logged_by: logForm.logged_by.trim() || null,
    });
    setSaving(false);
    if (error) {
      if (error.code === '23505') toast.error('Production already logged for today. Update existing entry.');
      else toast.error('Failed: ' + error.message);
      return;
    }
    toast.success('Production logged');
    setLogOpen(false);
    fetchData();
  };

  // --- History ---
  const openHistory = async (facilityId: string, name: string) => {
    setHistoryFacilityName(name);
    const { data } = await supabase.from('facility_production').select('*').eq('facility_id', facilityId).order('production_date', { ascending: false }).limit(30);
    setProductionHistory(data || []);
    setHistoryOpen(true);
  };

  const totalCapacity = facilities.reduce((s, f) => s + f.daily_capacity, 0);
  const totalStock = Object.values(latestProduction).reduce((s, p) => s + p.cylinders_in_stock, 0);
  const totalProducedToday = Object.values(latestProduction)
    .filter(p => p.production_date === new Date().toISOString().split('T')[0])
    .reduce((s, p) => s + p.cylinders_produced, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Production Facilities</h1>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus size={14} /> Add Facility
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Daily Capacity" value={totalCapacity} icon={<Factory size={18} />} color="primary" subtitle="cylinders/day" />
        <StatCard title="Current Total Stock" value={totalStock} icon={<Package size={18} />} color="success" subtitle="cylinders" />
        <StatCard title="Produced Today" value={totalProducedToday} icon={<TrendingUp size={18} />} color="secondary" subtitle="cylinders" />
        <StatCard title="Facilities" value={facilities.length} icon={<Zap size={18} />} color="warning" />
      </div>

      {/* Facility Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {facilities.map(f => {
          const prod = latestProduction[f.id];
          const utilPct = prod ? Math.round((prod.cylinders_dispatched / Math.max(f.daily_capacity, 1)) * 100) : 0;
          return (
            <div key={f.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-primary text-lg">⬡</span>
                  <div>
                    <h3 className="text-sm font-semibold">{f.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{f.location}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                  <Pencil size={13} />
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Capacity</span>
                  <span className="font-mono">{f.daily_capacity} cyl/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock on Hand</span>
                  <span className="font-mono font-bold text-success">{prod?.cylinders_in_stock ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produced Today</span>
                  <span className="font-mono">{prod?.production_date === new Date().toISOString().split('T')[0] ? prod.cylinders_produced : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dispatched Today</span>
                  <span className="font-mono">{prod?.production_date === new Date().toISOString().split('T')[0] ? prod.cylinders_dispatched : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilisation</span>
                  <span className={cn('font-mono font-bold', utilPct > 85 ? 'text-destructive' : 'text-success')}>{utilPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted">
                  <div className={cn('h-1.5 rounded-full transition-all', utilPct > 85 ? 'bg-destructive' : utilPct > 60 ? 'bg-warning' : 'bg-success')} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trucks</span>
                  <span className="font-mono">{truckCounts[f.id] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hospitals</span>
                  <span className="font-mono">{hospitalCounts[f.id] || 0}</span>
                </div>
              </div>

              {prod && prod.production_date !== new Date().toISOString().split('T')[0] && (
                <p className="text-[11px] text-warning font-medium">⚠ No production logged today</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1" onClick={() => openLog(f.id)}>
                  <Plus size={12} /> Log Production
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-8 gap-1" onClick={() => openHistory(f.id, f.name)}>
                  <BarChart3 size={12} /> History
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Facility Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Facility</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Location</Label><Input value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label>Daily Capacity (cylinders)</Label><Input type="number" value={editForm.daily_capacity} onChange={e => setEditForm(p => ({ ...p, daily_capacity: parseInt(e.target.value) || 0 }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Latitude</Label><Input value={editForm.latitude} onChange={e => setEditForm(p => ({ ...p, latitude: e.target.value }))} placeholder="e.g. 10.0159" /></div>
              <div><Label>Longitude</Label><Input value={editForm.longitude} onChange={e => setEditForm(p => ({ ...p, longitude: e.target.value }))} placeholder="e.g. 76.3419" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Facility Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Facility</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kochi O₂ Plant" /></div>
            <div><Label>Location *</Label><Input value={addForm.location} onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Ernakulam, Kerala" /></div>
            <div><Label>Daily Capacity (cylinders) *</Label><Input type="number" value={addForm.daily_capacity || ''} onChange={e => setAddForm(p => ({ ...p, daily_capacity: parseInt(e.target.value) || 0 }))} placeholder="e.g. 500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Latitude</Label><Input value={addForm.latitude} onChange={e => setAddForm(p => ({ ...p, latitude: e.target.value }))} placeholder="10.0159" /></div>
              <div><Label>Longitude</Label><Input value={addForm.longitude} onChange={e => setAddForm(p => ({ ...p, longitude: e.target.value }))} placeholder="76.3419" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveAdd} disabled={saving}>{saving ? 'Adding…' : 'Add Facility'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Production Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Today's Production</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Cylinders Produced</Label><Input type="number" value={logForm.cylinders_produced || ''} onChange={e => setLogForm(p => ({ ...p, cylinders_produced: parseInt(e.target.value) || 0 }))} /></div>
            <div><Label>Current Stock on Hand</Label><Input type="number" value={logForm.cylinders_in_stock || ''} onChange={e => setLogForm(p => ({ ...p, cylinders_in_stock: parseInt(e.target.value) || 0 }))} /></div>
            <div><Label>Cylinders Dispatched</Label><Input type="number" value={logForm.cylinders_dispatched || ''} onChange={e => setLogForm(p => ({ ...p, cylinders_dispatched: parseInt(e.target.value) || 0 }))} /></div>
            <div><Label>Logged By</Label><Input value={logForm.logged_by} onChange={e => setLogForm(p => ({ ...p, logged_by: e.target.value }))} placeholder="Your name" /></div>
            <div><Label>Notes</Label><Textarea value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any remarks…" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={saveLog} disabled={saving}>{saving ? 'Saving…' : 'Log Production'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Production History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-auto">
          <DialogHeader><DialogTitle>{historyFacilityName} — Production History</DialogTitle></DialogHeader>
          {productionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No production history yet.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Produced</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Stock</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Dispatched</th>
                  </tr>
                </thead>
                <tbody>
                  {productionHistory.map(p => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-2 font-mono">{format(new Date(p.production_date), 'dd MMM yyyy')}</td>
                      <td className="p-2 text-right font-mono">{p.cylinders_produced}</td>
                      <td className="p-2 text-right font-mono font-bold text-success">{p.cylinders_in_stock}</td>
                      <td className="p-2 text-right font-mono">{p.cylinders_dispatched}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
