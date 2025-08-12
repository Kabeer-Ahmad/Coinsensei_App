-- Fix RLS Policies for user_profile table
-- Run this script in your Supabase SQL Editor to fix the profile creation error

-- First, let's create a function that can insert profiles with elevated privileges
CREATE OR REPLACE FUNCTION create_user_profile(user_id uuid, user_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner
AS $$
BEGIN
  INSERT INTO public.user_profile (uid, full_name, created_at)
  VALUES (user_id, user_full_name, now())
  ON CONFLICT (uid) DO NOTHING; -- Prevent duplicate inserts
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text) TO authenticated;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Enable read access for users based on uid" ON public.user_profile;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profile;
DROP POLICY IF EXISTS "Enable update for users based on uid" ON public.user_profile;

-- Temporarily disable RLS to allow the function to work
ALTER TABLE public.user_profile DISABLE ROW LEVEL SECURITY;

-- Enable RLS on user_profile table
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Create KYC table
CREATE TABLE public.kyc (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_front_url TEXT,
  card_back_url TEXT,
  face_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN ('not_submitted', 'pending', 'verified', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Enable RLS on tables
ALTER TABLE public.kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profile
CREATE POLICY "Users can view own profile" ON public.user_profile
  FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE USING (auth.uid() = uid);

-- Create RLS policies for KYC table
CREATE POLICY "Users can view own KYC" ON public.kyc
  FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Users can insert own KYC" ON public.kyc
  FOR INSERT WITH CHECK (auth.uid() = uid);

CREATE POLICY "Users can update own KYC" ON public.kyc
  FOR UPDATE USING (auth.uid() = uid);

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

-- Create function to create user profile with elevated privileges
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  full_name TEXT,
  email TEXT
) RETURNS VOID AS $$
DECLARE
  pkr_address TEXT;
BEGIN
  -- Generate unique PKR wallet address
  pkr_address := generate_pkr_wallet_address();
  
  -- Create user profile
  INSERT INTO public.user_profile (uid, full_name, email)
  VALUES (user_id, full_name, email);
  
  -- Create initial KYC record
  INSERT INTO public.kyc (uid, status)
  VALUES (user_id, 'not_submitted');
  
  -- Create wallet record
  INSERT INTO public.wallets (uid, pkr_wallet_address)
  VALUES (user_id, pkr_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update KYC status (for admin use)
CREATE OR REPLACE FUNCTION public.update_kyc_status(
  kyc_id UUID,
  new_status TEXT,
  notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.kyc 
  SET status = new_status, 
      reviewer_notes = notes,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = kyc_id;
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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kyc_updated_at
  BEFORE UPDATE ON public.kyc
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create KYC storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
);

-- Create storage policies for KYC bucket
-- Users can upload their own KYC documents
CREATE POLICY "Users can upload own KYC documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own KYC documents
CREATE POLICY "Users can view own KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own KYC documents
CREATE POLICY "Users can update own KYC documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own KYC documents
CREATE POLICY "Users can delete own KYC documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow inserts for authenticated users (the function will handle this)
CREATE POLICY "Allow profile creation" ON public.user_profile
  FOR INSERT WITH CHECK (auth.uid() = uid);

-- Grant necessary permissions
GRANT ALL ON public.user_profile TO authenticated;
GRANT ALL ON public.user_profile TO service_role;
GRANT ALL ON public.user_profile TO anon; 