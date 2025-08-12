-- Create user_bank_accounts table for storing user's bank account details
CREATE TABLE IF NOT EXISTS public.user_bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_name TEXT NOT NULL,
    account_title TEXT NOT NULL,
    account_iban TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pkr_withdrawals table for tracking withdrawal requests
CREATE TABLE IF NOT EXISTS public.pkr_withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_bank_account_id UUID REFERENCES public.user_bank_accounts(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'declined')),
    admin_notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pkr_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_bank_accounts
CREATE POLICY "Users can view their own bank accounts" ON public.user_bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON public.user_bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON public.user_bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON public.user_bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pkr_withdrawals
CREATE POLICY "Users can view their own withdrawals" ON public.pkr_withdrawals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests" ON public.pkr_withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending withdrawals" ON public.pkr_withdrawals
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admin policies for pkr_withdrawals (for admin management)
CREATE POLICY "Admins can manage all withdrawals" ON public.pkr_withdrawals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profile 
            WHERE user_profile.uid = auth.uid() 
            AND user_profile.role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON public.user_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_active ON public.user_bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_pkr_withdrawals_user_id ON public.pkr_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_pkr_withdrawals_status ON public.pkr_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_pkr_withdrawals_created_at ON public.pkr_withdrawals(created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_user_bank_accounts_updated_at 
    BEFORE UPDATE ON public.user_bank_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pkr_withdrawals_updated_at 
    BEFORE UPDATE ON public.pkr_withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create pakistani_banks table for dropdown options
CREATE TABLE IF NOT EXISTS public.pakistani_banks (
    id SERIAL PRIMARY KEY,
    bank_name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'digital_wallet')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some sample Pakistani banks and digital wallets for the dropdown
INSERT INTO public.pakistani_banks (bank_name, type) VALUES
-- Traditional Banks
('HBL - Habib Bank Limited', 'bank'),
('UBL - United Bank Limited', 'bank'),
('MCB - Muslim Commercial Bank', 'bank'),
('ABL - Allied Bank Limited', 'bank'),
('NBP - National Bank of Pakistan', 'bank'),
('JS Bank', 'bank'),
('Bank Alfalah', 'bank'),
('Askari Bank', 'bank'),
('Faysal Bank', 'bank'),
('Meezan Bank', 'bank'),
('Bank of Punjab', 'bank'),
('Sindh Bank', 'bank'),
('Bank of Khyber', 'bank'),
('First Women Bank', 'bank'),
('SME Bank', 'bank'),
('Industrial Development Bank of Pakistan', 'bank'),
('Punjab Provincial Cooperative Bank', 'bank'),
('Zarai Taraqiati Bank Limited', 'bank'),

-- Digital Wallets
('JazzCash', 'digital_wallet'),
('EasyPaisa', 'digital_wallet'),
('UBL Omni', 'digital_wallet'),
('HBL Konnect', 'digital_wallet'),
('MCB Lite', 'digital_wallet'),
('PayMax', 'digital_wallet'),
('NayaPay', 'digital_wallet'),
('SadaPay', 'digital_wallet'),
('Finja', 'digital_wallet'),
('Telenor Bank', 'digital_wallet'),
('Mobilink Microfinance Bank', 'digital_wallet'),
('Telenor Microfinance Bank', 'digital_wallet'),
('U Microfinance Bank', 'digital_wallet'),
('Khushhali Microfinance Bank', 'digital_wallet'),
('Pak Oman Microfinance Bank', 'digital_wallet'),
('NRSP Microfinance Bank', 'digital_wallet'),
('Tameer Microfinance Bank', 'digital_wallet'),
('Apna Microfinance Bank', 'digital_wallet'),
('Waseela Microfinance Bank', 'digital_wallet'),
('PMIC Microfinance Bank', 'digital_wallet')
ON CONFLICT (bank_name) DO NOTHING; 