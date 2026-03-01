
CREATE TABLE public.financing_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL DEFAULT 'Angebot',
  bank_name text NOT NULL DEFAULT '',
  purchase_price numeric NOT NULL DEFAULT 0,
  down_payment numeric NOT NULL DEFAULT 0,
  financed_amount numeric NOT NULL DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 48,
  monthly_rate numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  balloon_payment numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financing_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for financing_offers" ON public.financing_offers FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_financing_offers_updated_at
BEFORE UPDATE ON public.financing_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
