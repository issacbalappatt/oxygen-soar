import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Plus, Clock } from 'lucide-react';
import { useAlerts } from '@/hooks/useO2Data';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/hospitals': 'Hospital Monitor',
  '/routes': 'Routes & Dispatch',
  '/log': 'Log O₂ Levels',
  '/facilities': 'Production Facilities',
  '/fleet': 'Fleet Management',
  '/analytics': 'Analytics',
  '/alerts': 'Alert Centre',
  '/history': 'Delivery History',
  '/partners': 'Hospital Partners',
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { criticalCount } = useAlerts();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const title = pageTitles[location.pathname] || 'O₂ Kerala';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
      <h1 className="text-lg font-semibold pl-10 lg:pl-0">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Critical badge */}
        {criticalCount > 0 && (
          <button
            onClick={() => navigate('/alerts')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold',
              'bg-destructive/20 text-destructive animate-critical-pulse'
            )}
          >
            <Bell size={14} />
            {criticalCount} Critical
          </button>
        )}

        {/* Clock */}
        <span className="hidden sm:block font-mono text-sm text-muted-foreground">
          <Clock size={14} className="inline mr-1" />
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>

        {/* Log O2 button */}
        <Button size="sm" onClick={() => navigate('/log')} className="gap-1.5">
          <Plus size={14} />
          <span className="hidden sm:inline">Log O₂ Level</span>
        </Button>
      </div>
    </header>
  );
}
