import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Image,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { TwoFactorService } from '../services/twoFactorService';
import { BiometricService } from '../services/biometricService';
import PasswordPrompt from '../components/PasswordPrompt';

type AccountSettingsNavigationProp = StackNavigationProp<RootStackParamList, 'AccountSettings'>;

const AccountSettings: React.FC = () => {
  const navigation = useNavigation<AccountSettingsNavigationProp>();
  const { user, fetchUserData, enableBiometric, disableBiometric } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState('Biometric');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Check biometric availability
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const available = await BiometricService.isAvailable();
      console.log('Biometric availability check:', available);
      setBiometricAvailable(available);
      
      // Always get the type name for display, even if not available
      const typeName = await BiometricService.getBiometricTypeName();
      console.log('Biometric type name:', typeName);
      setBiometricTypeName(typeName);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleKYC = () => {
    if (user?.kyc_status === 'not_submitted' || user?.kyc_status === 'rejected') {
      navigation.navigate('KYCSubmission');
    }
  };

  const handle2FASetup = () => {
    if (!user?.two_factor_enabled) {
      navigation.navigate('TwoFactorSetup');
    }
  };

  const handle2FADisable = async () => {
    try {
      await TwoFactorService.disable2FA(user?.uid || '');
      // Refresh user data to update 2FA status
      if (user?.uid) {
        await fetchUserData(user.uid, false);
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
    }
  };

  const handleChangePassword = () => {
    // Check if user has 2FA enabled
    if (user?.two_factor_enabled) {
      console.log('2FA enabled, navigating to OTP verification...');
      // Require 2FA verification before accessing Change Password screen
      navigation.navigate('OTPVerification', {
        action: 'change_password',
        onSuccess: () => {
          console.log('OTP verification successful, navigating to Change Password...');
          // After successful verification, navigate to Change Password screen
          navigation.navigate('ChangePassword');
        }
      });
    } else {
      console.log('No 2FA enabled, navigating directly to Change Password...');
      // No 2FA enabled, directly navigate to Change Password screen
      navigation.navigate('ChangePassword');
    }
  };

  const handleBiometricToggle = async () => {
    try {
      if (user?.biometric_enabled) {
        // Disable biometric
        Alert.alert(
          'Disable Biometric Login',
          `Are you sure you want to disable ${biometricTypeName} login?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await disableBiometric();
                console.log('Biometric authentication disabled');
              }
            }
          ]
        );
      } else {
        // Enable biometric - show password prompt
        setShowPasswordPrompt(true);
      }
    } catch (error) {
      console.error('Error toggling biometric:', error);
    }
  };

  const handlePasswordConfirm = async (password: string): Promise<boolean> => {
    try {
      if (!user?.email) {
        Alert.alert('Error', 'User email not found');
        return false;
      }

      console.log('Attempting to enable biometric with provided credentials...');
      const success = await enableBiometric(user.email, password);
      
      if (success) {
        Alert.alert(
          'Success',
          `${biometricTypeName} login has been enabled successfully!`,
          [{ text: 'OK' }]
        );
        setShowPasswordPrompt(false);
        return true;
      } else {
        Alert.alert(
          'Failed',
          'Failed to enable biometric login. Please check your password and try again.'
        );
        return false;
      }
    } catch (error: any) {
      console.error('Error enabling biometric:', error);
      Alert.alert('Error', error.message || 'Failed to enable biometric login');
      return false;
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh user data (profile, KYC status, wallet info)
      if (user?.uid) {
        await fetchUserData(user.uid, false);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getVerificationIcon = () => {
    switch (user?.kyc_status) {
      case 'verified':
        return { name: 'checkmark-circle', color: '#10b981', text: 'Verified' };
      case 'pending':
        return { name: 'time', color: '#f59e0b', text: 'Pending Review' };
      case 'rejected':
        return { name: 'close-circle', color: '#ef4444', text: 'Rejected' };
      default:
        return { name: 'close-circle', color: '#ef4444', text: 'Not Verified' };
    }
  };

  const getVerificationDescription = () => {
    switch (user?.kyc_status) {
      case 'verified':
        return 'Your account has been verified successfully. You can now access all features.';
      case 'pending':
        return 'Your KYC documents are under review. This usually takes 12-24 hours.';
      case 'rejected':
        return 'Your KYC was rejected. Please submit new documents.';
      default:
        return 'Complete KYC verification to unlock all features and increase limits.';
    }
  };

  const isKYCButtonEnabled = user?.kyc_status === 'not_submitted' || user?.kyc_status === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#09d2fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#09d2fe"
            colors={["#09d2fe"]}
          />
        }
      >
        <Animated.View
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Image 
                source={require('../../assets/android-chrome-192x192.png')} 
                style={styles.avatarImage}
                resizeMode="contain"
              />
              <View style={[styles.verificationBadge, { backgroundColor: getVerificationIcon().color }]}>
                <Ionicons 
                  name={getVerificationIcon().name as any} 
                  size={16} 
                  color="#ffffff" 
                />
              </View>
            </View>
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          {/* KYC Status Card */}
          <View style={styles.kycCard}>
            <View style={styles.kycHeader}>
              <View style={styles.kycIconContainer}>
                <Ionicons 
                  name={getVerificationIcon().name as any} 
                  size={24} 
                  color={getVerificationIcon().color} 
                />
              </View>
              <View style={styles.kycInfo}>
                <Text style={styles.kycTitle}>KYC Verification</Text>
                <Text style={[styles.kycStatus, { color: getVerificationIcon().color }]}>
                  {getVerificationIcon().text}
                </Text>
              </View>
            </View>
            <Text style={styles.kycDescription}>{getVerificationDescription()}</Text>
            
            <TouchableOpacity
              style={[
                styles.kycButton,
                !isKYCButtonEnabled && styles.kycButtonDisabled
              ]}
              onPress={handleKYC}
              disabled={!isKYCButtonEnabled}
            >
              {user?.kyc_status === 'pending' ? (
                <View style={styles.kycButtonContent}>
                  <Ionicons name="time" size={20} color="#f59e0b" />
                  <Text style={[styles.kycButtonText, { color: '#f59e0b' }]}>
                    Under Review - Please Wait
                  </Text>
                </View>
              ) : (
                <View style={styles.kycButtonContent}>
                  <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
                  <Text style={styles.kycButtonText}>
                    {user?.kyc_status === 'verified' ? 'Verified' : 'Complete KYC'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Account Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={20} color="#09d2fe" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{user?.full_name || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="mail-outline" size={20} color="#09d2fe" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{user?.email || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="call-outline" size={20} color="#09d2fe" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{user?.phone_number || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="card-outline" size={20} color="#09d2fe" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>CNIC Number</Text>
                <Text style={styles.detailValue}>{user?.cnic_number || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color="#09d2fe" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={styles.detailValue}>{user?.dob || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={20} color="#09d2fe" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{user?.address || 'Not provided'}</Text>
              </View>
            </View>
          </View>

          {/* Security Settings */}
          <View style={styles.securitySection}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <TouchableOpacity style={styles.securityItem} onPress={handleChangePassword}>
              <Ionicons name="lock-closed-outline" size={20} color="#09d2fe" />
              <View style={styles.securityContent}>
                <Text style={styles.securityLabel}>Change Password</Text>
                <Text style={styles.securityDescription}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.securityItem}>
              <Ionicons 
                name="finger-print-outline" 
                size={20} 
                color={biometricAvailable ? "#09d2fe" : "#6b7280"} 
              />
              <View style={styles.securityContent}>
                <Text style={[
                  styles.securityLabel,
                  !biometricAvailable && styles.securityLabelDisabled
                ]}>
                  {biometricTypeName} Login
                </Text>
                <Text style={[
                  styles.securityDescription,
                  !biometricAvailable && styles.securityDescriptionDisabled
                ]}>
                  {!biometricAvailable 
                    ? `${biometricTypeName} not available on this device`
                    : user?.biometric_enabled 
                      ? `${biometricTypeName} is enabled` 
                      : `Enable ${biometricTypeName.toLowerCase()} authentication`
                  }
                </Text>
              </View>
              <Switch
                value={biometricAvailable && (user?.biometric_enabled || false)}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{ false: '#333333', true: '#09d2fe' }}
                thumbColor={biometricAvailable && user?.biometric_enabled ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity style={styles.securityItem}>
              <Ionicons name="notifications-outline" size={20} color="#09d2fe" />
              <View style={styles.securityContent}>
                <Text style={styles.securityLabel}>Notification Settings</Text>
                <Text style={styles.securityDescription}>Manage your notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* 2FA Settings */}
            <View style={styles.securityItem}>
              <Ionicons 
                name={user?.two_factor_enabled ? "shield-checkmark" : "shield-outline"} 
                size={20} 
                color={user?.two_factor_enabled ? "#10b981" : "#09d2fe"} 
              />
              <View style={styles.securityContent}>
                <Text style={styles.securityLabel}>Two-Factor Authentication</Text>
                <Text style={styles.securityDescription}>
                  {user?.two_factor_enabled 
                    ? 'Enabled - Your account is protected with 2FA' 
                    : 'Disabled - Add an extra layer of security'
                  }
                </Text>
              </View>
              {user?.two_factor_enabled ? (
                <TouchableOpacity 
                  style={styles.disableButton}
                  onPress={handle2FADisable}
                >
                  <Text style={styles.disableButtonText}>Disable</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.enableButton}
                  onPress={handle2FASetup}
                >
                  <Text style={styles.enableButtonText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Password Prompt Modal */}
      <PasswordPrompt
        visible={showPasswordPrompt}
        title={`Enable ${biometricTypeName} Login`}
        message="Please enter your current password to securely enable biometric authentication."
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    paddingTop: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#94a3b8',
  },
  kycCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  kycHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  kycInfo: {
    flex: 1,
  },
  kycTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  kycStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  kycDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  kycButton: {
    backgroundColor: '#09d2fe',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  kycButtonDisabled: {
    backgroundColor: '#333333',
  },
  kycButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  detailContent: {
    flex: 1,
    marginLeft: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  securitySection: {
    marginBottom: 24,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  securityContent: {
    flex: 1,
    marginLeft: 16,
  },
  securityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  securityLabelDisabled: {
    color: '#6b7280',
  },
  securityDescriptionDisabled: {
    color: '#6b7280',
  },
  enableButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disableButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  disableButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AccountSettings; 