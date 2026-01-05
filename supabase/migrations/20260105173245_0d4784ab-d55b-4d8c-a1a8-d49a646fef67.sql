-- Add user_id to companies table to link with authenticated users
ALTER TABLE public.companies ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique constraint for user_id (one company per user)
ALTER TABLE public.companies ADD CONSTRAINT companies_user_id_unique UNIQUE (user_id);

-- Update RLS policies for companies
DROP POLICY IF EXISTS "Companies are publicly readable" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;

-- Users can view their own company
CREATE POLICY "Users can view their own company" 
ON public.companies FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own company
CREATE POLICY "Users can create their own company" 
ON public.companies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own company
CREATE POLICY "Users can update their own company" 
ON public.companies FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can do anything
CREATE POLICY "Admins can manage all companies" 
ON public.companies FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Update RLS for wallet_transactions
DROP POLICY IF EXISTS "Transactions are readable by company email" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Anyone can create transactions" ON public.wallet_transactions;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions" 
ON public.wallet_transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = wallet_transactions.company_id 
    AND companies.user_id = auth.uid()
  )
);

-- Users can create their own transactions
CREATE POLICY "Users can create their own transactions" 
ON public.wallet_transactions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = wallet_transactions.company_id 
    AND companies.user_id = auth.uid()
  )
);

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions" 
ON public.wallet_transactions FOR ALL 
USING (has_role(auth.uid(), 'admin'));