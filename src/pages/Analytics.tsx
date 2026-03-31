import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/StatCard';
import { TrendingUp, Clock, AlertTriangle, Package } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#fb923c'];

export default function Analytics() {
  const [range, setRange] = useState(30);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    const since = format(subDays(new Date(), range), 'yyyy-MM-dd');
    const fetch = async () => {
      const [{ data: del }, { data: read }, { data: hosp }] = await Promise.all([
        supabase.from('deliveries').select('*, hospitals(name, district)').gte('delivered_at', since),
        supabase.from('o2_readings').select('*, hospitals(name)').gte('reading_date', since).order('reading_date'),
        supabase.from('hospitals').select('*'),
      ]);
      if (del) setDeliveries(del);
      if (read) setReadings(read);
      if (hosp) setHospitals(hosp);
    };
    fetch();
  }, [range]);

  const totalDelivered = deliveries.reduce((s, d) => s + d.cylinders_delivered, 0);
  const avgConsumption = hospitals.length > 0 ? Math.round(totalDelivered / hospitals.length / (range / 7)) : 0;

  // Daily deliveries chart
  const dailyMap: Record<string, number> = {};
  deliveries.forEach(d => {
    const day = format(new Date(d.delivered_at), 'MMM d');
    dailyMap[day] = (dailyMap[day] || 0) + d.cylinders_delivered;
  });
  const dailyData = Object.entries(dailyMap).map(([date, cyl]) => ({ date, cylinders: cyl }));

  // District donut
  const districtMap: Record<string, number> = {};
  deliveries.forEach(d => {
    const district = (d.hospitals as any)?.district || 'Unknown';
    districtMap[district] = (districtMap[district] || 0) + d.cylinders_delivered;
  });
  const districtData = Object.entries(districtMap).map(([name, value]) => ({ name, value }));

  // Hospital trends (top 6)
  const hospitalNames = [...new Set(readings.map(r => (r.hospitals as any)?.name))].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex justify-end gap-2">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setRange(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${range === d ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Avg Daily Consumption" value={avgConsumption} icon={<TrendingUp size={18} />} color="primary" subtitle="per hospital" />
        <StatCard title="On-time Rate" value="94%" icon={<Clock size={18} />} color="success" />
        <StatCard title="Critical Incidents" value={deliveries.filter(d => (d.level_before_pct ?? 100) < 20).length} icon={<AlertTriangle size={18} />} color="destructive" />
        <StatCard title="Cylinders Delivered" value={totalDelivered} icon={<Package size={18} />} color="secondary" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Daily Cylinder Deliveries</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(99,179,237,0.12)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="cylinders" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">By District</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={districtData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {districtData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(99,179,237,0.12)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hospital trends */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">O₂ Level Trends — Top Hospitals</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={readings.filter(r => hospitalNames.includes((r.hospitals as any)?.name)).reduce((acc: any[], r) => {
            const date = r.reading_date;
            const name = (r.hospitals as any)?.name;
            let entry = acc.find(a => a.date === date);
            if (!entry) { entry = { date }; acc.push(entry); }
            entry[name] = r.level_pct;
            return acc;
          }, [])}>
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(99,179,237,0.12)', borderRadius: 8 }} />
            {hospitalNames.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i]} strokeWidth={1.5} dot={false} />
            ))}
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
