import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Route,
  Droplets,
  Factory,
  Truck,
  BarChart3,
  Bell,
  History,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { useAlerts } from '@/hooks/useO2Data';
import { cn } from '@/lib/utils';

const navSections = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: Building2, label: 'Hospitals', path: '/hospitals' },
      { icon: Route, label: 'Routes & Dispatch', path: '/routes' },
      { icon: Droplets, label: 'Log O₂ Levels', path: '/log' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { icon: Factory, label: 'Facilities', path: '/facilities' },
      { icon: Truck, label: 'Fleet', path: '/fleet' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { icon: Bell, label: 'Alerts', path: '/alerts' },
      { icon: History, label: 'Delivery History', path: '/history' },
      { icon: Users, label: 'Hospital Partners', path: '/partners' },
    ],
  },
];

export default function AppSidebar() {
  const { unreadCount } = useAlerts();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-background/80" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full bg-card border-r border-border flex flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-[220px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border gap-2">
          <span className="text-primary text-xl">⬡</span>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-primary font-semibold text-sm leading-none">O₂ Kerala</span>
              <span className="text-muted-foreground text-[9px] uppercase tracking-widest leading-none mt-0.5">Medical Gas Operations</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1.5">{section.title}</p>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors mb-0.5',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <item.icon size={18} />
                    {!collapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                    {!collapsed && item.label === 'Alerts' && unreadCount > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-border p-3">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                OP
              </div>
              <div>
                <p className="text-xs font-medium">Operator</p>
                <p className="text-[10px] text-muted-foreground">Dispatcher</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
