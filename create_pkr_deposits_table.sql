-- Create pkr_deposits table for tracking user deposit requests
CREATE TABLE IF NOT EXISTS public.pkr_deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
    screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.pkr_deposits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own deposits
CREATE POLICY "Users can view own deposits" ON public.pkr_deposits
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Create policy to allow users to insert their own deposits
CREATE POLICY "Users can create deposits" ON public.pkr_deposits
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Create policy to allow users to update their own pending deposits (for screenshot upload)
CREATE POLICY "Users can update own pending deposits" ON public.pkr_deposits
    FOR UPDATE USING (
        user_id = auth.uid() AND status = 'pending'
    );

-- Create policy to allow admins to manage all deposits
CREATE POLICY "Admins can manage all deposits" ON public.pkr_deposits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profile 
            WHERE uid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pkr_deposits_user_id ON public.pkr_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_pkr_deposits_status ON public.pkr_deposits(status);
CREATE INDEX IF NOT EXISTS idx_pkr_deposits_created_at ON public.pkr_deposits(created_at);
CREATE INDEX IF NOT EXISTS idx_pkr_deposits_bank_account_id ON public.pkr_deposits(bank_account_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_pkr_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pkr_deposits_updated_at
    BEFORE UPDATE ON public.pkr_deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_pkr_deposits_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.pkr_deposits TO authenticated;
GRANT ALL ON public.pkr_deposits TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.pkr_deposits IS 'PKR deposit requests from users';
COMMENT ON COLUMN public.pkr_deposits.user_id IS 'User who made the deposit request';
COMMENT ON COLUMN public.pkr_deposits.amount IS 'Amount in PKR to be deposited';
COMMENT ON COLUMN public.pkr_deposits.bank_account_id IS 'Selected bank account for deposit';
COMMENT ON COLUMN public.pkr_deposits.screenshot_url IS 'URL of payment screenshot uploaded by user';
COMMENT ON COLUMN public.pkr_deposits.status IS 'Status: pending, completed, or declined';
COMMENT ON COLUMN public.pkr_deposits.admin_notes IS 'Notes from admin about the deposit'; 