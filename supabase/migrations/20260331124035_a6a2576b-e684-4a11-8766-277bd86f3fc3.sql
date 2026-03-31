
-- Production Facilities (must be created first due to FK references)
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  daily_capacity integer NOT NULL,
  latitude float,
  longitude float,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read facilities" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "Allow public insert facilities" ON public.facilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update facilities" ON public.facilities FOR UPDATE USING (true);

-- Hospitals
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL,
  location text,
  contact_phone text,
  total_beds integer,
  cylinder_capacity integer NOT NULL,
  assigned_facility_id uuid REFERENCES public.facilities(id),
  reorder_threshold_pct integer DEFAULT 35,
  critical_threshold_pct integer DEFAULT 20,
  latitude float,
  longitude float,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Allow public insert hospitals" ON public.hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update hospitals" ON public.hospitals FOR UPDATE USING (true);

-- Trucks / Fleet
CREATE TABLE public.trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_code text UNIQUE NOT NULL,
  driver_name text NOT NULL,
  driver_phone text,
  cylinder_capacity integer NOT NULL DEFAULT 200,
  assigned_facility_id uuid REFERENCES public.facilities(id),
  status text CHECK (status IN ('en_route','loading','standby','maintenance')) DEFAULT 'standby',
  current_location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read trucks" ON public.trucks FOR SELECT USING (true);
CREATE POLICY "Allow public insert trucks" ON public.trucks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update trucks" ON public.trucks FOR UPDATE USING (true);

-- Daily O2 Level Readings
CREATE TABLE public.o2_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) NOT NULL,
  logged_by text,
  cylinders_available integer NOT NULL,
  cylinder_capacity integer NOT NULL,
  level_pct integer GENERATED ALWAYS AS (CASE WHEN cylinder_capacity > 0 THEN (cylinders_available * 100 / cylinder_capacity) ELSE 0 END) STORED,
  status text GENERATED ALWAYS AS (
    CASE
      WHEN cylinder_capacity > 0 AND (cylinders_available * 100 / cylinder_capacity) < 20 THEN 'critical'
      WHEN cylinder_capacity > 0 AND (cylinders_available * 100 / cylinder_capacity) < 40 THEN 'low'
      ELSE 'good'
    END
  ) STORED,
  notes text,
  reading_date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.o2_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read o2_readings" ON public.o2_readings FOR SELECT USING (true);
CREATE POLICY "Allow public insert o2_readings" ON public.o2_readings FOR INSERT WITH CHECK (true);

-- Delivery Routes
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name text NOT NULL,
  truck_id uuid REFERENCES public.trucks(id),
  facility_id uuid REFERENCES public.facilities(id),
  status text CHECK (status IN ('planned','active','completed','cancelled')) DEFAULT 'planned',
  total_distance_km integer,
  estimated_duration_hours numeric,
  total_cylinders integer,
  route_date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read routes" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Allow public insert routes" ON public.routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update routes" ON public.routes FOR UPDATE USING (true);

-- Route Stops
CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES public.routes(id) NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id) NOT NULL,
  stop_order integer NOT NULL,
  cylinders_to_deliver integer NOT NULL,
  eta time,
  actual_delivery_time timestamptz,
  status text CHECK (status IN ('pending','delivered','skipped')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read route_stops" ON public.route_stops FOR SELECT USING (true);
CREATE POLICY "Allow public insert route_stops" ON public.route_stops FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update route_stops" ON public.route_stops FOR UPDATE USING (true);

-- Delivery History
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id),
  truck_id uuid REFERENCES public.trucks(id),
  route_stop_id uuid REFERENCES public.route_stops(id),
  cylinders_delivered integer NOT NULL,
  level_before_pct integer,
  level_after_pct integer,
  delivered_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read deliveries" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Allow public insert deliveries" ON public.deliveries FOR INSERT WITH CHECK (true);

-- Alerts
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id),
  truck_id uuid REFERENCES public.trucks(id),
  alert_type text CHECK (alert_type IN ('critical','low','info','delivery_complete','overdue')) NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Allow public insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update alerts" ON public.alerts FOR UPDATE USING (true);

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.o2_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Indexes
CREATE INDEX idx_o2_readings_hospital ON public.o2_readings(hospital_id);
CREATE INDEX idx_o2_readings_date ON public.o2_readings(reading_date);
CREATE INDEX idx_alerts_read ON public.alerts(is_read);
CREATE INDEX idx_routes_date ON public.routes(route_date);
CREATE INDEX idx_route_stops_route ON public.route_stops(route_id);
CREATE INDEX idx_deliveries_hospital ON public.deliveries(hospital_id);
CREATE INDEX idx_deliveries_date ON public.deliveries(delivered_at);
