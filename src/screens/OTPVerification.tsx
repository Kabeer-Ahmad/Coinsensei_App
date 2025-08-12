import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { TwoFactorService } from '../services/twoFactorService';
import { supabase } from '../config/supabase';

interface OTPVerificationProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: string;
  title?: string;
  description?: string;
  userId?: string; // Add userId prop for cases where user context isn't available yet
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  visible,
  onClose,
  onSuccess,
  action,
  title,
  description,
  userId,
}) => {
  const { user } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const hiddenTotpInputRef = useRef<TextInput>(null);
  const handlePasteTotp = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const digits = (text || '').replace(/\D/g, '').slice(0, 6);
      if (digits.length > 0) setOtpCode(digits);
      hiddenTotpInputRef.current?.focus();
    } catch {}
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset states
      setOtpCode('');
      setBackupCode('');
      setShowBackupCode(false);
      setIsVerifying(false);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleVerifyOTP = async () => {
    const code = showBackupCode ? backupCode : otpCode;
    
    if (!code) {
      Alert.alert('Error', 'Please enter a verification code');
      return;
    }

    if (!showBackupCode && code.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit verification code');
      shakeAnimation();
      return;
    }

    if (showBackupCode && code.length !== 8) {
      Alert.alert('Error', 'Please enter an 8-digit backup code');
      shakeAnimation();
      return;
    }

    setIsVerifying(true);
    try {
      let isValid = false;

      // Use passed userId or fallback to user context
      const currentUserId = userId || user?.uid;
      
      console.log('OTP Verification Debug:', {
        code,
        codeLength: code.length,
        showBackupCode,
        userId: currentUserId,
        userContextId: user?.uid,
        passedUserId: userId
      });

      if (!currentUserId) {
        throw new Error('No user ID available for verification');
      }

      if (!showBackupCode) {
        // For TOTP codes, use local verification like in TwoFactorSetup
        console.log('Attempting TOTP verification...');
        
        const { data: profile, error: profileError } = await supabase
          .from('user_profile')
          .select('two_factor_secret, two_factor_enabled')
          .eq('uid', currentUserId)
          .single();

        console.log('Profile fetch result:', { profile, profileError });

        if (profileError || !profile?.two_factor_secret) {
          console.error('Failed to get 2FA secret:', profileError);
          throw new Error('Unable to get 2FA secret');
        }

        // Use exact same logic as TwoFactorSetup
        const secret = profile.two_factor_secret;
        console.log('Using secret:', secret);
        
        // Debug: Log the TOTP generation details (same as TwoFactorSetup)
        const debug = TwoFactorService.debugTOTP(secret);
        console.log('TOTP Debug (OTPVerification):', {
          secret,
          currentTime: debug.currentTime,
          counter: debug.counter,
          result: debug.result,
          inputCode: code
        });
        
        // Generate current TOTP for comparison
        const generatedTOTP = TwoFactorService.generateTOTP(secret);
        console.log('TOTP Comparison:', {
          generated: generatedTOTP,
          userInput: code,
          match: generatedTOTP === code
        });
        
        // Use exact same verification as TwoFactorSetup
        isValid = TwoFactorService.verifyTOTP(secret, code);
        console.log('TOTP verification result:', isValid);
      } else {
        // For backup codes, use database verification
        console.log('Attempting backup code verification...');
        isValid = await TwoFactorService.verifyOTP(currentUserId, code);
        console.log('Backup code verification result:', isValid);
      }
      
      if (isValid) {
        onSuccess();
        // Don't call onClose() here - let onSuccess handle navigation
      } else {
        Alert.alert('Invalid Code', 'The verification code is incorrect. Please try again.');
        shakeAnimation();
        setOtpCode('');
        setBackupCode('');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
      shakeAnimation();
    } finally {
      setIsVerifying(false);
    }
  };

  const getDefaultTitle = () => {
    switch (action) {
      case 'login':
        return 'Verify Your Identity';
      case 'add_bank':
        return 'Add Bank Account';
      case 'delete_bank':
        return 'Delete Bank Account';
      default:
        return 'Security Verification';
    }
  };

  const getDefaultDescription = () => {
    switch (action) {
      case 'login':
        return 'Please enter your 2FA code to complete login';
      case 'add_bank':
        return 'Please verify your identity to add a new bank account';
      case 'delete_bank':
        return 'Please verify your identity to delete this bank account';
      default:
        return 'Please verify your identity to continue';
    }
  };

  const handleClose = () => {
    if (!isVerifying) {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <TouchableOpacity 
          style={styles.backdropTouch} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Animated.View
                style={[
                  styles.container,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { scale: scaleAnim },
                      { translateX: shakeAnim },
                    ],
                  },
                ]}
              >
                <SafeAreaView style={styles.content}>
                  {/* Close Button */}
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={handleClose}
                    disabled={isVerifying}
                  >
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>

                  {/* Header */}
                  <View style={styles.header}>
                  <View style={styles.iconContainerSmall}>
                    <Ionicons name="shield-checkmark" size={36} color="#09d2fe" />
                  </View>
                  <Text style={styles.titleSmall}>{title || getDefaultTitle()}</Text>
                  <Text style={styles.descriptionSmall}>
                    {description || getDefaultDescription()}
                  </Text>
                  </View>

            {/* OTP Input Section */}
            <View style={styles.inputSection}>
              {!showBackupCode ? (
                <>
                  <Text style={styles.inputLabel}>Authenticator Code</Text>
                  {/* Hidden input */}
                  <TextInput
                    ref={hiddenTotpInputRef}
                    value={otpCode}
                    onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    autoFocus
                    style={styles.hiddenInput}
                    editable={!isVerifying}
                  />
                  {/* Code boxes */}
                  <TouchableOpacity activeOpacity={0.9} onPress={() => hiddenTotpInputRef.current?.focus()}>
                    <View style={styles.codeBoxesRow}>
                      {Array.from({ length: 6 }).map((_, idx) => {
                        const char = otpCode[idx] || '';
                        const isFilled = idx < otpCode.length;
                        const isActive = idx === Math.min(otpCode.length, 5);
                        return (
                          <View key={idx} style={[styles.codeBox, isFilled && styles.codeBoxFilled, isActive && styles.codeBoxActive]}>
                            <Text style={styles.codeBoxText}>{char}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.pasteRowCentered}>
                    <TouchableOpacity onPress={handlePasteTotp} style={styles.pasteButton} activeOpacity={0.85}> 
                      <Ionicons name="clipboard-outline" size={18} color="#09d2fe" />
                      <Text style={styles.pasteButtonText}>Paste</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.inputHint}>
                    Enter the 6-digit code from your authenticator app
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Backup Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={backupCode}
                    onChangeText={(t) => setBackupCode(t.replace(/[^0-9]/g, '').slice(0, 8))}
                    placeholder="00000000"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    maxLength={8}
                    autoFocus={true}
                    editable={!isVerifying}
                  />
                  <Text style={styles.inputHint}>
                    Enter one of your 8-digit backup codes
                  </Text>
                </>
              )}

              {/* Switch between OTP and Backup Code */}
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  setShowBackupCode(!showBackupCode);
                  setOtpCode('');
                  setBackupCode('');
                }}
                disabled={isVerifying}
              >
                <Text style={styles.switchButtonText}>
                  {showBackupCode 
                    ? 'Use authenticator app instead' 
                    : 'Use backup code instead'
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
              <View style={styles.buttonSectionCompact}>
              <TouchableOpacity
                style={[styles.verifyButtonSmall, isVerifying && styles.verifyButtonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <View style={styles.loadingContainerSmall}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.verifyButtonTextSmall}>Verifying...</Text>
                  </View>
                ) : (
                  <Text style={styles.verifyButtonTextSmall}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isVerifying}
              >
                <Text style={styles.cancelButtonTextSmall}>Cancel</Text>
              </TouchableOpacity>
            </View>
                </SafeAreaView>
              </Animated.View>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    width: width * 0.9,
    maxWidth: 420,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  content: {
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#09d2fe20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#09d2fe20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  titleSmall: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  descriptionSmall: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  codeBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  codeBox: {
    width: 42,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: '#09d2fe',
  },
  codeBoxActive: {
    borderColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  codeBoxText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  pasteRowCentered: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pasteButtonText: {
    color: '#09d2fe',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    marginBottom: 8,
    letterSpacing: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchButtonText: {
    fontSize: 14,
    color: '#09d2fe',
    fontWeight: '500',
  },
  buttonSection: { gap: 12 },
  buttonSectionCompact: { gap: 8 },
  verifyButton: {
    backgroundColor: '#09d2fe',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#09d2fe',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  verifyButtonSmall: {
    backgroundColor: '#09d2fe',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#09d2fe',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  verifyButtonDisabled: {
    backgroundColor: '#6b7280',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  verifyButtonTextSmall: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3a',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonTextSmall: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OTPVerification;