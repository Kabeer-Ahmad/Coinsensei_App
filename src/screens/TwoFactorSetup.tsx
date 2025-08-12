import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { TwoFactorService } from '../services/twoFactorService';
import { Clipboard } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

type TwoFactorSetupNavigationProp = StackNavigationProp<RootStackParamList, 'TwoFactorSetup'>;

const TwoFactorSetup: React.FC = () => {
  const navigation = useNavigation<TwoFactorSetupNavigationProp>();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [secret, setSecret] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const qrScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    setup2FA();
    animateEntrance();
  }, []);

  // Reset verification state when step changes
  useEffect(() => {
    if (step !== 2) {
      setIsCodeVerified(false);
      setVerificationCode('');
    }
  }, [step]);

  useEffect(() => {
    animateProgress();
  }, [step]);

  const animateEntrance = () => {
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
  };

  const animateProgress = () => {
    Animated.timing(progressAnim, {
      toValue: step / 3,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const setup2FA = async () => {
    try {
      setIsLoading(true);
      
      // Generate 2FA secret
      const generatedSecret = await TwoFactorService.generateSecret(user?.uid || '');
      setSecret(generatedSecret);

      // Generate QR code
      const qrCodeDataURL = await TwoFactorService.generateQRCode(generatedSecret, user?.full_name || '');
      setQrCode(qrCodeDataURL);

      // Generate backup codes
      const codes = await TwoFactorService.generateBackupCodes(user?.uid || '');
      setBackupCodes(codes);

      setIsLoading(false);
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      Alert.alert('Error', 'Failed to setup 2FA. Please try again.');
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (step === 2 && !isCodeVerified) {
      Alert.alert(
        'Verification Required',
        'Please verify your authenticator setup by entering the 6-digit code before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleComplete = async () => {
    try {
      setIsSettingUp(true);
      
      // Enable 2FA and generate backup codes
      await TwoFactorService.enable2FA(user?.uid || '', secret);
      const generatedBackupCodes = await TwoFactorService.generateBackupCodes(user?.uid!);
      setBackupCodes(generatedBackupCodes);
      
      Alert.alert(
        '2FA Enabled Successfully!',
        'Your account is now protected with two-factor authentication. Make sure to save your backup codes!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      Alert.alert('Error', 'Failed to enable 2FA. Please try again.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    try {
      // Use local TOTP verification with the secret
      const isValid = TwoFactorService.verifyTOTP(secret, verificationCode);
      
      if (isValid) {
        setIsCodeVerified(true);
        Alert.alert(
          'Verification Successful!',
          'Your authenticator is working correctly. You can now proceed to save backup codes.',
          [{ text: 'Continue', onPress: () => setStep(3) }]
        );
      } else {
        Alert.alert('Invalid Code', 'The verification code is incorrect. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="qr-code" size={48} color="#09d2fe" />
        <Text style={styles.stepTitle}>Scan QR Code</Text>
        <Text style={styles.stepDescription}>
          Open Google Authenticator and scan this QR code to add your account
        </Text>
      </View>

      <View style={styles.qrContainer}>
        {qrCode ? (
          <Animated.View style={[styles.qrWrapper, { transform: [{ scale: qrScaleAnim }] }]}>
            <QRCode
              value={qrCode}
              size={200}
              color="#000000"
              backgroundColor="#ffffff"
              logoSize={0}
            />
          </Animated.View>
        ) : (
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={64} color="#6b7280" />
            <Text style={styles.qrPlaceholderText}>Generating QR Code...</Text>
          </View>
        )}
      </View>

      <View style={styles.secretContainer}>
        <Text style={styles.secretLabel}>Manual Entry Code:</Text>
        <TouchableOpacity
          style={styles.secretBox}
          onPress={() => copyToClipboard(secret, 'Secret key')}
        >
          <Text style={styles.secretText}>{secret}</Text>
          <Ionicons name="copy" size={20} color="#09d2fe" />
        </TouchableOpacity>
        <Text style={styles.secretHint}>
          Use this code if you can't scan the QR code
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="shield-checkmark" size={48} color="#10b981" />
        <Text style={styles.stepTitle}>Verify Setup</Text>
        <Text style={styles.stepDescription}>
          Enter the 6-digit code from Google Authenticator to verify setup
        </Text>
      </View>

      <View style={styles.verificationContainer}>
        <Text style={styles.verificationText}>
          Please enter the 6-digit code from your Google Authenticator app
        </Text>
        
        <View style={styles.codeInputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.codeInput,
                isCodeVerified && styles.codeInputSuccess
              ]}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="000000"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              maxLength={6}
              autoFocus={true}
              secureTextEntry={false}
              editable={!isCodeVerified}
            />
            {isCodeVerified && (
              <View style={styles.successIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              </View>
            )}
          </View>
          <Text style={[
            styles.codeInputHint,
            isCodeVerified && styles.codeInputHintSuccess
          ]}>
            {isCodeVerified ? 'Code verified successfully!' : 'Enter the 6-digit code from your authenticator app'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.verifyButton, 
            (isVerifying || isCodeVerified) && styles.verifyButtonDisabled
          ]}
          onPress={handleVerifyCode}
          disabled={isVerifying || isCodeVerified}
        >
          {isVerifying ? (
            <Text style={styles.verifyButtonText}>Verifying...</Text>
          ) : isCodeVerified ? (
            <Text style={styles.verifyButtonText}>Verified ✓</Text>
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="key" size={48} color="#f59e0b" />
        <Text style={styles.stepTitle}>Backup Codes</Text>
        <Text style={styles.stepDescription}>
          Save these backup codes in a secure location. You can use them to access your account if you lose your phone.
        </Text>
      </View>

      <View style={styles.backupContainer}>
        <TouchableOpacity
          style={styles.showBackupButton}
          onPress={() => setShowBackupCodes(!showBackupCodes)}
        >
          <Ionicons 
            name={showBackupCodes ? "eye-off" : "eye"} 
            size={20} 
            color="#09d2fe" 
          />
          <Text style={styles.showBackupText}>
            {showBackupCodes ? 'Hide Backup Codes' : 'Show Backup Codes'}
          </Text>
        </TouchableOpacity>

        {showBackupCodes && (
          <View style={styles.backupCodesContainer}>
            {backupCodes.map((code, index) => (
              <TouchableOpacity
                key={index}
                style={styles.backupCodeItem}
                onPress={() => copyToClipboard(code, 'Backup code')}
              >
                <Text style={styles.backupCodeText}>{code}</Text>
                <Ionicons name="copy" size={16} color="#6b7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Keep these codes safe! You can only see them once.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="shield" size={64} color="#09d2fe" />
          <Text style={styles.loadingText}>Setting up 2FA...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setup 2FA</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            { width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })}
          ]} 
        />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity 
            style={[
              styles.nextButton, 
              step === 2 && !isCodeVerified && styles.disabledButton
            ]} 
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {step === 2 ? (isCodeVerified ? 'Continue' : 'Verify Code First') : 'Next'}
            </Text>
            <Ionicons 
              name={step === 2 && !isCodeVerified ? "lock-closed" : "arrow-forward"} 
              size={20} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.nextButton, isSettingUp && styles.disabledButton]} 
            onPress={handleComplete}
            disabled={isSettingUp}
          >
            {isSettingUp ? (
              <Text style={styles.nextButtonText}>Enabling 2FA...</Text>
            ) : (
              <>
                <Text style={styles.nextButtonText}>Complete Setup</Text>
                <Ionicons name="checkmark" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#09d2fe',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#09d2fe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  secretContainer: {
    width: '100%',
    maxWidth: 300,
  },
  secretLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  secretBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 8,
  },
  secretText: {
    fontSize: 14,
    color: '#09d2fe',
    fontFamily: 'monospace',
    flex: 1,
  },
  secretHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  verificationContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  verifyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  codeInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  codeInputSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#0d1f17',
  },
  successIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  codeInputHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  codeInputHintSuccess: {
    color: '#10b981',
    fontWeight: '600',
  },

  backupContainer: {
    width: '100%',
    maxWidth: 300,
  },
  showBackupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  showBackupText: {
    color: '#09d2fe',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backupCodesContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  backupCodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backupCodeText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nextButton: {
    backgroundColor: '#09d2fe',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 16,
  },
});

export default TwoFactorSetup; 