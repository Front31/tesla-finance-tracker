
-- finance_config: single-row config table
CREATE TABLE public.finance_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_price NUMERIC NOT NULL DEFAULT 42990,
  down_payment NUMERIC NOT NULL DEFAULT 10000,
  financed_amount NUMERIC NOT NULL DEFAULT 32990,
  start_date DATE NOT NULL DEFAULT '2024-06-01',
  duration_months INTEGER NOT NULL DEFAULT 48,
  monthly_rate NUMERIC NOT NULL DEFAULT 450,
  interest_rate NUMERIC NOT NULL DEFAULT 3.99,
  vehicle_model TEXT NOT NULL DEFAULT 'Model 3',
  vehicle_trim TEXT NOT NULL DEFAULT 'Long Range',
  vehicle_year INTEGER NOT NULL DEFAULT 2024,
  vin TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'rate',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tesla_vehicle_state
CREATE TABLE public.tesla_vehicle_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'Model 3',
  trim TEXT NOT NULL DEFAULT 'Long Range',
  year INTEGER NOT NULL DEFAULT 2024,
  odometer_km NUMERIC NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  raw_json JSONB,
  tesla_access_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- market_price_daily
CREATE TABLE public.market_price_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  avg_price_eur NUMERIC NOT NULL,
  min_price_eur NUMERIC NOT NULL,
  max_price_eur NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  filters_used JSONB,
  source TEXT DEFAULT 'mobile.de',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS for single-user app
ALTER TABLE public.finance_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesla_vehicle_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_daily DISABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_finance_config_updated_at
  BEFORE UPDATE ON public.finance_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tesla_vehicle_state_updated_at
  BEFORE UPDATE ON public.tesla_vehicle_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config row
INSERT INTO public.finance_config (purchase_price, down_payment, financed_amount, start_date, duration_months, monthly_rate, interest_rate, vehicle_model, vehicle_trim, vehicle_year, vin)
VALUES (42990, 10000, 32990, '2024-06-01', 48, 450, 3.99, 'Model 3', 'Long Range', 2024, '');

-- Insert default tesla state row
INSERT INTO public.tesla_vehicle_state (vin, model, trim, year, odometer_km)
VALUES ('', 'Model 3', 'Long Range', 2024, 0);
