-- Create transfers table for tracking USDT transfers
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount DECIMAL(15,8) NOT NULL,
    network TEXT NOT NULL CHECK (network IN ('TRC20', 'BEP20')),
    transaction_hash TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    gas_fee DECIMAL(15,8) DEFAULT 0,
    block_number BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own transfers
CREATE POLICY "Users can view own transfers" ON public.transfers
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Create policy to allow users to create their own transfers
CREATE POLICY "Users can create transfers" ON public.transfers
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Create policy to allow admins to manage all transfers
CREATE POLICY "Admins can manage all transfers" ON public.transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profile 
            WHERE uid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON public.transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON public.transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_transaction_hash ON public.transfers(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transfers_network ON public.transfers(network);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transfers_updated_at
    BEFORE UPDATE ON public.transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_transfers_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.transfers IS 'USDT transfer records';
COMMENT ON COLUMN public.transfers.user_id IS 'User who initiated the transfer';
COMMENT ON COLUMN public.transfers.from_address IS 'Source wallet address';
COMMENT ON COLUMN public.transfers.to_address IS 'Destination wallet address';
COMMENT ON COLUMN public.transfers.amount IS 'Amount of USDT transferred';
COMMENT ON COLUMN public.transfers.network IS 'Blockchain network (TRC20 or BEP20)';
COMMENT ON COLUMN public.transfers.transaction_hash IS 'Blockchain transaction hash';
COMMENT ON COLUMN public.transfers.status IS 'Transfer status: pending, confirmed, or failed';
COMMENT ON COLUMN public.transfers.gas_fee IS 'Gas fee paid for the transaction';
COMMENT ON COLUMN public.transfers.block_number IS 'Block number where transaction was confirmed'; 