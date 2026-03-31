import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import HospitalMonitor from "@/pages/HospitalMonitor";
import RoutesDispatch from "@/pages/RoutesDispatch";
import LogO2Levels from "@/pages/LogO2Levels";
import Facilities from "@/pages/Facilities";
import FleetManagement from "@/pages/FleetManagement";
import Analytics from "@/pages/Analytics";
import AlertCentre from "@/pages/AlertCentre";
import DeliveryHistory from "@/pages/DeliveryHistory";
import HospitalPartners from "@/pages/HospitalPartners";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hospitals" element={<HospitalMonitor />} />
            <Route path="/routes" element={<RoutesDispatch />} />
            <Route path="/log" element={<LogO2Levels />} />
            <Route path="/facilities" element={<Facilities />} />
            <Route path="/fleet" element={<FleetManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/alerts" element={<AlertCentre />} />
            <Route path="/history" element={<DeliveryHistory />} />
            <Route path="/partners" element={<HospitalPartners />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
