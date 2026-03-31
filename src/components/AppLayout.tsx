import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import Topbar from './Topbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col lg:ml-[220px]">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
