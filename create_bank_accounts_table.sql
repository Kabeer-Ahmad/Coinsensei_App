-- Create bank_accounts table for admin-managed payment accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_title TEXT NOT NULL,
    account_iban TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only admins to manage bank accounts
-- Note: This assumes you have a role column in user_profile or auth.users
-- You may need to adjust this based on your admin role implementation
CREATE POLICY "Admins can manage bank accounts" ON public.bank_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profile 
            WHERE uid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create policy to allow all authenticated users to view active bank accounts
CREATE POLICY "Users can view active bank accounts" ON public.bank_accounts
    FOR SELECT USING (
        is_active = true
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_name ON public.bank_accounts(bank_name);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Insert some sample bank accounts (optional - remove in production)
-- INSERT INTO public.bank_accounts (bank_name, account_title, account_iban, is_active) VALUES
--     ('HBL Bank', 'Coinsensei Trading', 'PK36HABB0000001234567890', true),
--     ('UBL Bank', 'Coinsensei Payments', 'PK37UNIL0000000987654321', true),
--     ('MCB Bank', 'Coinsensei Services', 'PK38MUCB0000001122334455', false);

-- Grant necessary permissions
GRANT SELECT ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.bank_accounts IS 'Bank accounts managed by admins for receiving payments';
COMMENT ON COLUMN public.bank_accounts.bank_name IS 'Name of the bank';
COMMENT ON COLUMN public.bank_accounts.account_title IS 'Account holder name/title';
COMMENT ON COLUMN public.bank_accounts.account_iban IS 'Account number or IBAN';
COMMENT ON COLUMN public.bank_accounts.is_active IS 'Whether this account is active for receiving payments'; 