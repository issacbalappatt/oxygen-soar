import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, History } from 'lucide-react';
import { toast } from 'sonner';

interface HospitalForm {
  name: string;
  district: string;
  contact_phone: string;
  total_beds: string;
  cylinder_capacity: string;
  assigned_facility_id: string;
  reorder_threshold_pct: string;
  critical_threshold_pct: string;
  latitude: string;
  longitude: string;
  location: string;
}

const emptyForm: HospitalForm = {
  name: '', district: '', contact_phone: '', total_beds: '',
  cylinder_capacity: '', assigned_facility_id: '', reorder_threshold_pct: '35',
  critical_threshold_pct: '20', latitude: '', longitude: '', location: '',
};

export default function HospitalPartners() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HospitalForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [{ data: hosp }, { data: fac }] = await Promise.all([
      supabase.from('hospitals').select('*, facilities(name)'),
      supabase.from('facilities').select('*'),
    ]);
    if (hosp) setHospitals(hosp);
    if (fac) setFacilities(fac);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (h: any) => {
    setEditingId(h.id);
    setForm({
      name: h.name || '',
      district: h.district || '',
      contact_phone: h.contact_phone || '',
      total_beds: h.total_beds?.toString() || '',
      cylinder_capacity: h.cylinder_capacity?.toString() || '',
      assigned_facility_id: h.assigned_facility_id || '',
      reorder_threshold_pct: h.reorder_threshold_pct?.toString() || '35',
      critical_threshold_pct: h.critical_threshold_pct?.toString() || '20',
      latitude: h.latitude?.toString() || '',
      longitude: h.longitude?.toString() || '',
      location: h.location || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.district || !form.cylinder_capacity) {
      toast.error('Name, District and Cylinder Capacity are required');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      district: form.district,
      contact_phone: form.contact_phone || null,
      total_beds: form.total_beds ? parseInt(form.total_beds) : null,
      cylinder_capacity: parseInt(form.cylinder_capacity),
      assigned_facility_id: form.assigned_facility_id || null,
      reorder_threshold_pct: parseInt(form.reorder_threshold_pct) || 35,
      critical_threshold_pct: parseInt(form.critical_threshold_pct) || 20,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      location: form.location || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('hospitals').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('hospitals').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error('Save failed: ' + error.message);
    } else {
      toast.success(editingId ? 'Hospital updated' : 'Hospital added');
      setDialogOpen(false);
      fetchData();
    }
  };

  const set = (key: keyof HospitalForm, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus size={14} /> Add Hospital
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3">Hospital Name</th>
              <th className="text-left p-3">District</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Beds</th>
              <th className="text-left p-3">O₂ Capacity</th>
              <th className="text-left p-3">Assigned Plant</th>
              <th className="text-left p-3">Reorder %</th>
              <th className="text-left p-3">Critical %</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {hospitals.map(h => (
              <tr key={h.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-medium">{h.name}</td>
                <td className="p-3 text-muted-foreground">{h.district}</td>
                <td className="p-3 text-muted-foreground font-mono">{h.contact_phone}</td>
                <td className="p-3 font-mono">{h.total_beds}</td>
                <td className="p-3 font-mono">{h.cylinder_capacity}</td>
                <td className="p-3 text-muted-foreground">{(h.facilities as any)?.name}</td>
                <td className="p-3 font-mono">{h.reorder_threshold_pct}%</td>
                <td className="p-3 font-mono">{h.critical_threshold_pct}%</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(h)} className="text-primary hover:text-primary/80">
                      <Edit size={14} />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground">
                      <History size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {hospitals.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No hospitals yet. Click "Add Hospital" to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Hospital' : 'Add Hospital'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Hospital Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. District Hospital Ernakulam" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>District *</Label>
                <Input value={form.district} onChange={e => set('district', e.target.value)} placeholder="e.g. Ernakulam" />
              </div>
              <div className="grid gap-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+91 ..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Total Beds</Label>
                <Input type="number" value={form.total_beds} onChange={e => set('total_beds', e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Cylinder Capacity *</Label>
                <Input type="number" value={form.cylinder_capacity} onChange={e => set('cylinder_capacity', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Assigned Plant</Label>
              <Select value={form.assigned_facility_id} onValueChange={v => set('assigned_facility_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                <SelectContent>
                  {facilities.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Reorder Threshold %</Label>
                <Input type="number" value={form.reorder_threshold_pct} onChange={e => set('reorder_threshold_pct', e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Critical Threshold %</Label>
                <Input type="number" value={form.critical_threshold_pct} onChange={e => set('critical_threshold_pct', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Location / Address</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Full address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="e.g. 9.9312" />
              </div>
              <div className="grid gap-1.5">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="e.g. 76.2673" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
