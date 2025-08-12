-- Create wallets table
CREATE TABLE public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pkr_wallet_address TEXT UNIQUE NOT NULL,
  trc20_wallet_address TEXT,
  bep20_wallet_address TEXT,
  pkr_balance DECIMAL(20,2) DEFAULT 0.00,
  usdt_balance DECIMAL(20,8) DEFAULT 0.00000000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(uid)
);

-- Enable RLS on wallets table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wallets table
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Users can update own wallet" ON public.wallets
  FOR UPDATE USING (auth.uid() = uid);

-- Function to generate unique PKR wallet address
CREATE OR REPLACE FUNCTION generate_pkr_wallet_address()
RETURNS TEXT AS $$
DECLARE
  wallet_address TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a unique PKR wallet address format: PKR-XXXX-XXXX-XXXX
    wallet_address := 'PKR-' || 
                     upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
                     upper(substring(md5(random()::text || clock_timestamp()::text) from 5 for 4)) || '-' ||
                     upper(substring(md5(random()::text || clock_timestamp()::text) from 9 for 4));
    
    -- Check if address already exists
    IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE pkr_wallet_address = wallet_address) THEN
      RETURN wallet_address;
    END IF;
    
    counter := counter + 1;
    -- Prevent infinite loop
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique PKR wallet address after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT, TEXT);

-- Create the updated create_user_profile function to include wallet creation
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  full_name TEXT
) RETURNS VOID AS $$
DECLARE
  pkr_address TEXT;
BEGIN
  -- Generate unique PKR wallet address
  pkr_address := generate_pkr_wallet_address();
  
  -- Create user profile
  INSERT INTO public.user_profile (uid, full_name)
  VALUES (user_id, full_name);
  
  -- Create initial KYC record (if KYC table exists)
  BEGIN
    INSERT INTO public.kyc (uid, status)
    VALUES (user_id, 'not_submitted');
  EXCEPTION
    WHEN undefined_table THEN
      -- KYC table doesn't exist, skip it
      NULL;
  END;
  
  -- Create wallet record
  INSERT INTO public.wallets (uid, pkr_wallet_address)
  VALUES (user_id, pkr_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update wallet balances
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  user_id UUID,
  pkr_amount DECIMAL DEFAULT NULL,
  usdt_amount DECIMAL DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.wallets 
  SET 
    pkr_balance = COALESCE(pkr_amount, pkr_balance),
    usdt_balance = COALESCE(usdt_amount, usdt_balance),
    updated_at = NOW()
  WHERE uid = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp for wallets
CREATE OR REPLACE FUNCTION update_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallets_updated_at(); 