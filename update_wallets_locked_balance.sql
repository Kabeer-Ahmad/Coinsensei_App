-- Add locked balance fields to wallets table
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS pkr_locked DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS usdt_locked DECIMAL(15,2) DEFAULT 0;

-- Update the create_user_profile function to include locked balances
DROP FUNCTION IF EXISTS public.create_user_profile(uuid, text);

CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_id uuid,
    user_full_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pkr_address text;
BEGIN
    -- Generate PKR wallet address
    pkr_address := generate_pkr_wallet_address();
    
    -- Insert user profile
    INSERT INTO public.user_profile (uid, full_name, role, kyc_status)
    VALUES (user_id, user_full_name, 'user', 'not_submitted');
    
    -- Insert KYC record
    INSERT INTO public.kyc (uid, status)
    VALUES (user_id, 'not_submitted');
    
    -- Insert wallet record with locked balances
    INSERT INTO public.wallets (
        uid, 
        pkr_wallet_address, 
        pkr_balance, 
        usdt_balance, 
        pkr_locked, 
        usdt_locked,
        is_active
    )
    VALUES (
        user_id, 
        pkr_address, 
        0, 
        0, 
        0, 
        0,
        true
    );
END;
$$;

-- Create function to handle PKR withdrawal (move balance to locked)
CREATE OR REPLACE FUNCTION public.process_pkr_withdrawal(
    user_id uuid,
    withdrawal_amount decimal(15,2)
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance decimal(15,2);
    current_locked decimal(15,2);
BEGIN
    -- Get current balance and locked amount
    SELECT pkr_balance, pkr_locked 
    INTO current_balance, current_locked
    FROM public.wallets 
    WHERE uid = user_id;
    
    -- Check if user has sufficient balance
    IF current_balance < withdrawal_amount THEN
        RETURN false;
    END IF;
    
    -- Update wallet: subtract from balance, add to locked
    UPDATE public.wallets 
    SET 
        pkr_balance = pkr_balance - withdrawal_amount,
        pkr_locked = pkr_locked + withdrawal_amount,
        updated_at = NOW()
    WHERE uid = user_id;
    
    RETURN true;
END;
$$;

-- Create function to confirm withdrawal (clear locked balance)
CREATE OR REPLACE FUNCTION public.confirm_pkr_withdrawal(
    withdrawal_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    withdrawal_record record;
BEGIN
    -- Get withdrawal details
    SELECT * INTO withdrawal_record
    FROM public.pkr_withdrawals 
    WHERE id = withdrawal_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update withdrawal status
    UPDATE public.pkr_withdrawals 
    SET 
        status = 'completed',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = withdrawal_id;
    
    -- Clear locked balance (amount already deducted from balance)
    UPDATE public.wallets 
    SET 
        pkr_locked = pkr_locked - withdrawal_record.amount,
        updated_at = NOW()
    WHERE uid = withdrawal_record.user_id;
    
    RETURN true;
END;
$$;

-- Create function to decline withdrawal (return locked balance)
CREATE OR REPLACE FUNCTION public.decline_pkr_withdrawal(
    withdrawal_id uuid,
    admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    withdrawal_record record;
BEGIN
    -- Get withdrawal details
    SELECT * INTO withdrawal_record
    FROM public.pkr_withdrawals 
    WHERE id = withdrawal_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update withdrawal status
    UPDATE public.pkr_withdrawals 
    SET 
        status = 'declined',
        admin_notes = admin_notes,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = withdrawal_id;
    
    -- Return locked balance to available balance
    UPDATE public.wallets 
    SET 
        pkr_balance = pkr_balance + withdrawal_record.amount,
        pkr_locked = pkr_locked - withdrawal_record.amount,
        updated_at = NOW()
    WHERE uid = withdrawal_record.user_id;
    
    RETURN true;
END;
$$;

-- Update the types interface to include locked balances
-- Note: This is for reference, actual TypeScript update will be done separately 