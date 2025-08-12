import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export interface BiometricCredentials {
  email: string;
  password: string;
}

export class BiometricService {
  /**
   * Check if biometric authentication is available on the device
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      console.log('Biometric availability check:', {
        hasHardware,
        isEnrolled,
        supportedTypes
      });
      
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get supported biometric types
   */
  static async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  /**
   * Check if biometric login is enabled for the user
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Enable biometric login and store credentials securely
   */
  static async enableBiometric(email: string, password: string): Promise<boolean> {
    try {
      console.log('Starting biometric enablement process...');
      
      // Check if biometric is available
      const isAvailable = await this.isAvailable();
      console.log('Biometric availability:', isAvailable);
      
      if (!isAvailable) {
        console.log('Biometric not available - showing alert');
        Alert.alert(
          'Biometric Not Available',
          'Biometric authentication is not available on this device or not set up.'
        );
        return false;
      }

      console.log('Requesting biometric authentication...');
      // Authenticate with biometric to verify user can use it
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable biometric login',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        // iOS: prevent falling back to device passcode so Face ID/Touch ID is used
        disableDeviceFallback: true,
      });

      console.log('Biometric authentication result:', {
        success: result.success,
        error: result.error,
        warning: result.warning,
        type: result.type
      });

      if (!result.success) {
        console.log('Biometric authentication failed:', result.error);
        return false;
      }

      console.log('Biometric authentication successful, storing credentials...');
      
      // Store credentials securely
      const credentials: BiometricCredentials = { email, password };
      await SecureStore.setItemAsync(
        BIOMETRIC_CREDENTIALS_KEY, 
        JSON.stringify(credentials)
      );
      
      // Enable biometric flag
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      
      console.log('Biometric credentials stored successfully');
      return true;
    } catch (error) {
      console.error('Error enabling biometric login:', error);
      Alert.alert('Error', 'Failed to enable biometric login. Please try again.');
      return false;
    }
  }

  /**
   * Disable biometric login and remove stored credentials
   */
  static async disableBiometric(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    } catch (error) {
      console.error('Error disabling biometric login:', error);
    }
  }

  /**
   * Authenticate with biometric and return stored credentials
   */
  static async authenticateWithBiometric(): Promise<BiometricCredentials | null> {
    try {
      // Check if biometric is enabled
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return null;
      }

      // Check if biometric is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Biometric Not Available',
          'Biometric authentication is not available. Please use your email and password.'
        );
        return null;
      }

      // Authenticate with biometric
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in with biometric authentication',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        // iOS: prevent falling back to device passcode so Face ID/Touch ID is used
        disableDeviceFallback: true,
      });

      if (!result.success) {
        console.log('Biometric authentication failed:', {
          error: result.error,
          warning: result.warning,
          type: result.type
        });
        return null;
      }

      // Retrieve stored credentials
      const credentialsString = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsString) {
        console.error('No biometric credentials found');
        return null;
      }

      const credentials: BiometricCredentials = JSON.parse(credentialsString);
      return credentials;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      Alert.alert('Error', 'Biometric authentication failed. Please try again.');
      return null;
    }
  }

  /**
   * Get the name of the primary biometric type for display
   */
  static async getBiometricTypeName(): Promise<string> {
    try {
      const types = await this.getSupportedTypes();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      } else {
        return 'Biometric';
      }
    } catch (error) {
      console.error('Error getting biometric type name:', error);
      return 'Biometric';
    }
  }

  /**
   * Get the appropriate icon name for the biometric type
   */
  static async getBiometricIconName(): Promise<string> {
    try {
      const types = await this.getSupportedTypes();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'scan-outline';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'finger-print-outline';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'eye-outline';
      } else {
        return 'shield-checkmark-outline';
      }
    } catch (error) {
      console.error('Error getting biometric icon name:', error);
      return 'shield-checkmark-outline';
    }
  }
}