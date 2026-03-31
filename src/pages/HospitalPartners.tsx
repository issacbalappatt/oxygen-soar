import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Edit, History } from 'lucide-react';
import { toast } from 'sonner';

export default function HospitalPartners() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: hosp }, { data: fac }] = await Promise.all([
        supabase.from('hospitals').select('*, facilities(name)'),
        supabase.from('facilities').select('*'),
      ]);
      if (hosp) setHospitals(hosp);
      if (fac) setFacilities(fac);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5"><Plus size={14} /> Add Hospital</Button>
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
              <tr key={h.id} className="border-b border-border/50 hover:bg-surface-2/30">
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
                    <button className="text-primary hover:text-primary/80"><Edit size={14} /></button>
                    <button className="text-muted-foreground hover:text-foreground"><History size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
