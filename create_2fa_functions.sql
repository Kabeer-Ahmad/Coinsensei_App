-- Create function to generate 2FA secret
CREATE OR REPLACE FUNCTION generate_2fa_secret(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret TEXT;
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    i INTEGER;
    random_byte INTEGER;
BEGIN
    -- Generate a random 32-character base32 secret
    secret := '';
    FOR i IN 1..32 LOOP
        random_byte := floor(random() * 32) + 1;
        secret := secret || substr(chars, random_byte, 1);
    END LOOP;
    
    -- Update user profile with the secret
    UPDATE user_profile 
    SET two_factor_secret = secret
    WHERE uid = user_id;
    
    RETURN secret;
END;
$$;

-- Create function to enable 2FA
CREATE OR REPLACE FUNCTION enable_2fa(user_id UUID, secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_profile 
    SET two_factor_enabled = TRUE,
        two_factor_secret = secret
    WHERE uid = user_id;
    
    RETURN TRUE;
END;
$$;

-- Create function to disable 2FA
CREATE OR REPLACE FUNCTION disable_2fa(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_profile 
    SET two_factor_enabled = FALSE,
        two_factor_secret = NULL,
        backup_codes = NULL
    WHERE uid = user_id;
    
    RETURN TRUE;
END;
$$;

-- Create function to generate backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    codes TEXT[] := ARRAY[]::TEXT[];
    i INTEGER;
    code TEXT;
BEGIN
    -- Generate 8 backup codes
    FOR i IN 1..8 LOOP
        -- Generate 8-digit code
        code := lpad(floor(random() * 100000000)::TEXT, 8, '0');
        codes := array_append(codes, code);
    END LOOP;
    
    -- Update user profile with backup codes
    UPDATE user_profile 
    SET backup_codes = codes
    WHERE uid = user_id;
    
    RETURN codes;
END;
$$;

-- Create function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(user_id UUID, otp TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret TEXT;
    backup_codes TEXT[];
    is_backup_code BOOLEAN := FALSE;
BEGIN
    -- Get user's 2FA secret and backup codes
    SELECT two_factor_secret, backup_codes 
    INTO secret, backup_codes
    FROM user_profile 
    WHERE uid = user_id;
    
    -- Check if OTP is a backup code
    IF backup_codes IS NOT NULL AND otp = ANY(backup_codes) THEN
        -- Remove used backup code
        UPDATE user_profile 
        SET backup_codes = array_remove(backup_codes, otp)
        WHERE uid = user_id;
        
        RETURN TRUE;
    END IF;
    
    -- For now, return TRUE (we'll implement TOTP verification in the app)
    -- In production, you'd want to verify TOTP here
    RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_2fa_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION enable_2fa(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_2fa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_backup_codes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_otp(UUID, TEXT) TO authenticated; 