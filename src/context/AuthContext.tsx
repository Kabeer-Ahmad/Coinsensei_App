import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { UserProfile, KYC, Wallet, AuthContextType } from '../types';
import { BiometricService } from '../services/biometricService';
// import { walletService } from '../services/walletService';

// Global storage for 2FA login credentials (temporary, cleared after use)
let pending2FACredentials: { email: string; password: string } | null = null;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState<{ userId: string; show: boolean } | null>(null);
  const [isBiometricLogin, setIsBiometricLogin] = useState(false);
  const [suppress2FA, setSuppress2FA] = useState(false);

  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener');
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && session.user.id) {
        console.log('Found existing session for user:', session.user.id);
        fetchUserData(session.user.id);
      } else {
        console.log('No existing session found');
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (suppress2FA) {
          console.log('Email OTP flow active - suppressing 2FA and data fetch for this auth event');
          return;
        }
        
        if (session?.user && session.user.id) {
          console.log('AuthContext: User authenticated, checking 2FA status');
          
          // Skip 2FA check for TOKEN_REFRESHED and USER_UPDATED events to prevent infinite loops
          if (event === 'TOKEN_REFRESHED') {
            console.log('Token refreshed, skipping 2FA check');
            return;
          }
          
          if (event === 'USER_UPDATED') {
            console.log('User updated (e.g., password change), skipping 2FA check');
            return;
          }
          
          // Check if user has 2FA enabled
          const { data: profile, error: profileError } = await supabase
            .from('user_profile')
            .select('two_factor_enabled')
            .eq('uid', session.user.id)
            .single();

          if (profileError) {
            console.error('Error checking 2FA status:', profileError);
            // If we can't check 2FA status, proceed without 2FA
            await fetchUserData(session.user.id);
            return;
          }

          const requires2FA = profile?.two_factor_enabled || false;
          console.log('2FA check result:', { userId: session.user.id, requires2FA });

          if (requires2FA && event === 'SIGNED_IN' && !isBiometricLogin) {
            // User has 2FA enabled and just signed in (not biometric), show 2FA modal
            console.log('2FA required, showing verification modal');
            setPending2FA({ userId: session.user.id, show: true });
            setLoading(false);
          } else {
            // No 2FA required, biometric login, or this is not a fresh sign in, proceed normally
            console.log('No 2FA required or biometric login or already verified, fetching user data');
            setPending2FA(null);
            
            // Handle biometric login specially
            if (isBiometricLogin) {
              console.log('Biometric login detected - bypassing 2FA verification');
              // Don't reset the flag here - let the signInWithBiometric function handle it
              await fetchUserData(session.user.id);
            } else {
              await fetchUserData(session.user.id);
            }
          }
              } else {
        console.log('AuthContext: Clearing user data - no session');
        console.log('Event that caused sign out:', event);
        console.log('Current pending2FA state:', pending2FA);
        
        // Clear user data
        setUser(null);
        setWallet(null);
        setPending2FA(null);
        setLoading(false);
      }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string, showLoading: boolean = true) => {
    // Don't fetch data if no valid user ID
    if (!userId || userId.trim() === '') {
      console.log('No valid userId provided, skipping data fetch');
      if (showLoading) setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      console.log('Fetching user data for userId:', userId);
      
      // Check current session for database queries
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('Current session for DB queries:', {
        hasSession: !!currentSession,
        sessionUserId: currentSession?.user?.id,
        accessToken: currentSession?.access_token ? 'Present' : 'Missing',
        tokenType: currentSession?.token_type,
        expiresAt: currentSession?.expires_at
      });
      
      // Check if session is properly set for requests
      console.log('Session details:', {
        sessionValid: !!currentSession,
        userMatches: currentSession?.user?.id === userId,
        accessTokenLength: currentSession?.access_token?.length || 0
      });
      
      // If no session but we have a userId, this might be a timing issue during 2FA
      // Try to wait a bit and check again
      if (!currentSession && userId) {
        console.log('No session found, waiting 500ms and trying again...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        console.log('Retry session check:', {
          hasSession: !!retrySession,
          sessionUserId: retrySession?.user?.id,
          accessToken: retrySession?.access_token ? 'Present' : 'Missing'
        });
      }
      
      // Test database connection first
      const { data: testData, error: testError } = await supabase
        .from('user_profile')
        .select('uid')
        .limit(1);
      
      console.log('Database connection test:', { 
        testData: testData ? testData.length : 0, 
        testError 
      });
      
      // Test if this specific user exists (debugging RLS)
      const { data: specificUserTest, error: specificUserError } = await supabase
        .from('user_profile')
        .select('uid, full_name')
        .eq('uid', userId);
      
      console.log('Specific user test (no .single()):', {
        count: specificUserTest ? specificUserTest.length : 0,
        data: specificUserTest,
        error: specificUserError
      });
      
      // Fetch user profile
      console.log('Querying user_profile table with userId:', userId);
      const { data: profile, error: profileError } = await supabase
        .from('user_profile')
        .select('*')
        .eq('uid', userId)
        .single();
      
      console.log('Profile query result:', { 
        profile: profile ? 'Found' : 'Not found', 
        profileError,
        userId: userId,
        profileId: profile?.uid 
      });

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Don't return early, try to fetch other data
      } else {
        console.log('Profile fetched successfully:', profile);
      }

      // Fetch KYC data
      const { data: kyc, error: kycError } = await supabase
        .from('kyc')
        .select('*')
        .eq('uid', userId)
        .single();

      if (kycError && kycError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching KYC:', kycError);
      } else if (kyc) {
        console.log('KYC fetched successfully:', kyc);
      }

      // Fetch wallet data
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('uid', userId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletError);
      } else if (walletData) {
        console.log('Wallet fetched successfully:', walletData);
      }

      // Only set user if profile exists
      if (profile) {
        // Get current user session for email
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        // Check actual biometric state from secure storage
        const actualBiometricEnabled = await BiometricService.isBiometricEnabled();
        
        const userWithKYC: UserProfile = {
          ...profile,
          email: authUser?.email,
          biometric_enabled: actualBiometricEnabled, // Use actual state from secure storage
          kyc_status: kyc?.status || 'not_submitted'
        };
        setUser(userWithKYC);
        setWallet(walletData);
      } else {
        console.error('No profile found for user:', userId);
        setUser(null);
        setWallet(null);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setUser(null);
      setWallet(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Removed generateAndStoreWalletAddresses function - wallet creation is now handled by the database function

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile using RPC function
        const { error: profileError } = await supabase.rpc('create_user_profile', {
          user_id: data.user.id,
          user_full_name: fullName
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }

        // Wallet creation is now handled by the create_user_profile RPC function
        // Add a small delay to ensure database operations are complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fetch the complete user data
        await fetchUserData(data.user.id);
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Simple sign in that triggers 2FA check in auth state listener
  const signInWith2FA = async (email: string, password: string) => {
    // Store credentials for potential re-authentication after 2FA
    pending2FACredentials = { email, password };
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      pending2FACredentials = null; // Clear on error
      throw error;
    }
    // Auth state listener will handle the rest including 2FA check
    return data;
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await fetchUserData(data.user.id);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Complete login after 2FA verification with fresh authentication
  const complete2FALogin = async () => {
    if (pending2FA && pending2FACredentials) {
      try {
        console.log('2FA verification successful, performing fresh authentication...');
        
        // Store the user ID and clear pending2FA immediately
        const userId = pending2FA.userId;
        const credentials = pending2FACredentials;
        setPending2FA(null);
        
        console.log('Re-authenticating with stored credentials...');
        
        // Perform fresh authentication with the stored credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });
        
        // Clear stored credentials after use
        pending2FACredentials = null;
        
        if (error) {
          console.error('Re-authentication failed:', error);
          throw error;
        }
        
        console.log('Fresh authentication successful, setting user data...');
        
        // Create user object from fresh session
        if (data.session?.user) {
          const user = data.session.user;
          
          // Check actual biometric state from secure storage
          const actualBiometricEnabled = await BiometricService.isBiometricEnabled();
          
          const minimalUser: UserProfile = {
            uid: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email || 'User',
            username: user.user_metadata?.username,
            phone_number: user.user_metadata?.phone_number,
            avatar_url: user.user_metadata?.avatar_url,
            role: 'user',
            cnic_number: user.user_metadata?.cnic_number,
            dob: user.user_metadata?.dob,
            address: user.user_metadata?.address,
            kyc_status: 'not_submitted',
            two_factor_enabled: true,
            biometric_enabled: actualBiometricEnabled, // Use actual state from secure storage
            created_at: user.created_at,
            is_locked: false
          };
          
          setUser(minimalUser);
          setLoading(false);
          
          console.log('User logged in successfully with fresh authentication');
          
          // Try to fetch complete profile data with the fresh session
          console.log('Attempting to fetch complete profile with fresh session...');
          try {
            // Wait a bit for session to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetchUserData(user.id, false);
            console.log('Complete profile fetched successfully with fresh session');
          } catch (error) {
            console.log('Profile fetch still failed with fresh session, using session metadata:', error);
            // User stays logged in with session metadata regardless
          }
        } else {
          throw new Error('No user data in fresh authentication response');
        }
        
      } catch (error: any) {
        console.error('Complete 2FA login error:', error);
        // Clear everything on error
        setPending2FA(null);
        pending2FACredentials = null;
        await supabase.auth.signOut();
        throw error;
      }
    } else {
      console.error('No pending 2FA or stored credentials for completion');
    }
  };

  // Cancel 2FA login and sign out
  const cancel2FALogin = async () => {
    setPending2FA(null);
    pending2FACredentials = null;
    await supabase.auth.signOut();
  };

  // Controls to suppress 2FA handling while we run email OTP first
  const beginEmailOtpFlow = () => setSuppress2FA(true);
  const endEmailOtpFlow = () => setSuppress2FA(false);

  // Complete 2FA using the existing session (used when email OTP already established a session)
  const complete2FAUsingExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUserId = session?.user?.id;
      if (!sessionUserId) {
        console.error('Complete 2FA using existing session failed: no active session');
        return;
      }
      setPending2FA(null);
      await fetchUserData(sessionUserId);
    } catch (error) {
      console.error('Error completing 2FA with existing session:', error);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setWallet(null);
      pending2FACredentials = null;
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithBiometric = async (): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting biometric authentication...');
      
      const credentials = await BiometricService.authenticateWithBiometric();
      if (!credentials) {
        return false;
      }

      console.log('Biometric authentication successful, signing in...');
      
      // Set flag to bypass 2FA for this login
      setIsBiometricLogin(true);
      
      // Sign in with retrieved credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error('Sign in error after biometric auth:', error);
        // Reset flag on error
        setIsBiometricLogin(false);
        throw error;
      }

      console.log('User signed in successfully with biometric');
      
      // Follow the same pattern as regular signIn - fetch user data directly
      if (data.user) {
        console.log('Fetching user data for biometric login...');
        await fetchUserData(data.user.id);
        console.log('Biometric login completed successfully');
        // Reset biometric login flag after successful completion
        setIsBiometricLogin(false);
        return true;
      } else {
        console.log('Biometric login failed - no user data in response');
        // Reset biometric login flag on failure
        setIsBiometricLogin(false);
        return false;
      }
    } catch (error: any) {
      console.error('Biometric sign in error:', error);
      // Reset flag on error
      setIsBiometricLogin(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const enableBiometric = async (email: string, password: string): Promise<boolean> => {
    try {
      const success = await BiometricService.enableBiometric(email, password);
      if (success && user) {
        // Update user profile to reflect biometric is enabled
        setUser({ ...user, biometric_enabled: true });
      }
      return success;
    } catch (error: any) {
      console.error('Enable biometric error:', error);
      return false;
    }
  };

  const disableBiometric = async (): Promise<void> => {
    try {
      await BiometricService.disableBiometric();
      if (user) {
        // Update user profile to reflect biometric is disabled
        setUser({ ...user, biometric_enabled: false });
      }
    } catch (error: any) {
      console.error('Disable biometric error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    wallet,
    loading,
    pending2FA,
    signUp,
    signIn,
    signOut,
    fetchUserData,
    signInWith2FA,
    complete2FALogin,
    cancel2FALogin,
    beginEmailOtpFlow,
    endEmailOtpFlow,
    complete2FAUsingExistingSession,
    signInWithBiometric,
    enableBiometric,
    disableBiometric,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 