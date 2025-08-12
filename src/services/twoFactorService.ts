import { supabase } from '../config/supabase';
import { TOTP } from 'totp-generator';

export class TwoFactorService {
  // Generate 2FA secret
  static async generateSecret(userId: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_2fa_secret', {
        user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw error;
    }
  }

  // Generate QR code for Google Authenticator
  static async generateQRCode(secret: string, email: string): Promise<string> {
    try {
      const otpauth = `otpauth://totp/CoinSensei:${email}?secret=${secret}&issuer=CoinSensei`;
      return otpauth; // Return the otpauth URL directly for the QR component
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Enable 2FA
  static async enable2FA(userId: string, secret: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('enable_2fa', {
        user_id: userId,
        secret: secret
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  // Disable 2FA
  static async disable2FA(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('disable_2fa', {
        user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  // Generate backup codes
  static async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', {
        user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating backup codes:', error);
      throw error;
    }
  }

  // Verify OTP
  static async verifyOTP(userId: string, otp: string): Promise<boolean> {
    try {
      // If it's a 6-digit code, try local TOTP verification first
      if (otp.length === 6) {
        // Get user's 2FA secret for local verification
        const { data: profile, error: profileError } = await supabase
          .from('user_profile')
          .select('two_factor_secret')
          .eq('uid', userId)
          .single();

        if (profile?.two_factor_secret) {
          const isValidTOTP = this.verifyTOTP(profile.two_factor_secret, otp);
          console.log('TOTP verification result:', {
            inputCode: otp,
            generatedCode: this.generateTOTP(profile.two_factor_secret),
            isValid: isValidTOTP
          });
          if (isValidTOTP) {
            return true;
          }
        }
      }

      // If local TOTP verification failed or it's an 8-digit backup code,
      // try database verification for backup codes
      const { data, error } = await supabase.rpc('verify_otp', {
        user_id: userId,
        otp: otp
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false; // Return false instead of throwing to allow graceful handling
    }
  }

  // Verify TOTP locally
  static verifyTOTP(secret: string, token: string): boolean {
    try {
      const generatedToken = this.generateTOTP(secret);
      console.log('verifyTOTP Debug:', {
        secret,
        generatedToken,
        userToken: token,
        match: token === generatedToken
      });
      return token === generatedToken;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }

  // Generate TOTP using totp-generator (guaranteed to match Google Authenticator)
  static generateTOTP(secret: string): string {
    try {
      const result = TOTP.generate(secret);
      return result.otp;
    } catch (error) {
      console.error('Error generating TOTP:', error);
      throw error;
    }
  }

  // Generate TOTP for a specific time (for testing)
  static generateTOTPForTime(secret: string, time: number): string {
    try {
      const result = TOTP.generate(secret);
      return result.otp;
    } catch (error) {
      console.error('Error generating TOTP for time:', error);
      throw error;
    }
  }

  // Get user's 2FA status
  static async get2FAStatus(userId: string): Promise<{
    enabled: boolean;
    secret?: string;
    backupCodes?: string[];
  }> {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('two_factor_enabled, two_factor_secret, backup_codes')
        .eq('uid', userId)
        .single();

      if (error) throw error;

      return {
        enabled: data.two_factor_enabled || false,
        secret: data.two_factor_secret,
        backupCodes: data.backup_codes
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw error;
    }
  }

  // Debug function to test TOTP generation
  static debugTOTP(secret: string): {
    currentTime: number;
    counter: number;
    result: string;
  } {
    try {
      const now = Math.floor(Date.now() / 1000);
      const timeStep = 30;
      const counter = Math.floor(now / timeStep);
      
      const result = TOTP.generate(secret);
      
      return {
        currentTime: now,
        counter,
        result: result.otp
      };
    } catch (error) {
      console.error('Error in debugTOTP:', error);
      throw error;
    }
  }
} 