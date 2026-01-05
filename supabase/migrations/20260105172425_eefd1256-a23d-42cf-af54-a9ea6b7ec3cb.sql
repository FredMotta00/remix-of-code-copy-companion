-- Create enum for wallet transaction types
CREATE TYPE public.wallet_transaction_type AS ENUM ('earn', 'burn', 'adjustment');

-- Create enum for wallet transaction status
CREATE TYPE public.wallet_transaction_status AS ENUM ('pending', 'available', 'used', 'cancelled');

-- Create enum for company tiers
CREATE TYPE public.company_tier AS ENUM ('silver', 'gold', 'platinum');

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  wallet_balance NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  tier company_tier NOT NULL DEFAULT 'silver',
  total_locacoes_ano NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
  type wallet_transaction_type NOT NULL,
  status wallet_transaction_status NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add company_id to reservas table
ALTER TABLE public.reservas ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add cashback columns to reservas
ALTER TABLE public.reservas ADD COLUMN cashback_amount NUMERIC DEFAULT 0;
ALTER TABLE public.reservas ADD COLUMN wallet_discount NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Companies are publicly readable" 
ON public.companies FOR SELECT USING (true);

CREATE POLICY "Admins can manage companies" 
ON public.companies FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for wallet_transactions
CREATE POLICY "Transactions are readable by company email" 
ON public.wallet_transactions FOR SELECT USING (true);

CREATE POLICY "Admins can manage transactions" 
ON public.wallet_transactions FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create transactions" 
ON public.wallet_transactions FOR INSERT WITH CHECK (true);

-- Create function to update company tier based on annual rentals
CREATE OR REPLACE FUNCTION public.update_company_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Silver: < 50k, Gold: 50k-150k, Platinum: > 150k
  IF NEW.total_locacoes_ano >= 150000 THEN
    NEW.tier = 'platinum';
  ELSIF NEW.total_locacoes_ano >= 50000 THEN
    NEW.tier = 'gold';
  ELSE
    NEW.tier = 'silver';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-update tier
CREATE TRIGGER update_company_tier_trigger
BEFORE INSERT OR UPDATE OF total_locacoes_ano ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_company_tier();

-- Function to get cashback percentage based on tier
CREATE OR REPLACE FUNCTION public.get_cashback_percentage(tier_value company_tier)
RETURNS NUMERIC AS $$
BEGIN
  CASE tier_value
    WHEN 'platinum' THEN RETURN 0.05; -- 5%
    WHEN 'gold' THEN RETURN 0.03; -- 3%
    ELSE RETURN 0.02; -- 2% Silver
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();