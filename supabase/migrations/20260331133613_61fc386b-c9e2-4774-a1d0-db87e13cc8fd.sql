
CREATE TABLE public.facility_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  cylinders_produced integer NOT NULL DEFAULT 0,
  cylinders_in_stock integer NOT NULL DEFAULT 0,
  cylinders_dispatched integer NOT NULL DEFAULT 0,
  notes text,
  logged_by text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(facility_id, production_date)
);

ALTER TABLE public.facility_production ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read facility_production" ON public.facility_production FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert facility_production" ON public.facility_production FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update facility_production" ON public.facility_production FOR UPDATE TO public USING (true);
