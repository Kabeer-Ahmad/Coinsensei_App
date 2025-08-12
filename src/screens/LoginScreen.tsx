import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { TwoFactorService } from '../services/twoFactorService';
import { BiometricService } from '../services/biometricService';
import OTPVerification from './OTPVerification';
import { supabase } from '../config/supabase';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signInWith2FA, loading, pending2FA, complete2FALogin, cancel2FALogin, signInWithBiometric, complete2FAUsingExistingSession, beginEmailOtpFlow, endEmailOtpFlow } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricIconName, setBiometricIconName] = useState('scan-outline');
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const hiddenEmailInputRef = useRef<TextInput>(null);
  const [showVerifyingOverlay, setShowVerifyingOverlay] = useState(false);

  const handlePasteEmailOtp = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const digits = (text || '').replace(/\D/g, '').slice(0, 6);
      if (digits.length > 0) setEmailOtpCode(digits);
      hiddenEmailInputRef.current?.focus();
    } catch {}
  };
  // Remove local 2FA state - now handled by AuthContext

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim1 = useRef(new Animated.Value(0)).current;
  const backgroundAnim2 = useRef(new Animated.Value(0)).current;
  const backgroundAnim3 = useRef(new Animated.Value(0)).current;
  
  // Field animation values
  const emailAnim = useRef(new Animated.Value(0)).current;
  const passwordAnim = useRef(new Animated.Value(0)).current;
  const emailScaleAnim = useRef(new Animated.Value(1)).current;
  const passwordScaleAnim = useRef(new Animated.Value(1)).current;
  
  // Spinner animation
  const spinnerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered field animations
    Animated.stagger(200, [
      Animated.timing(emailAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(passwordAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Spinner animation
    if (loading) {
      Animated.loop(
        Animated.timing(spinnerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinnerAnim.setValue(0);
    }

    // Background animations
    const animateBackground = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(backgroundAnim1, {
              toValue: 1,
              duration: 6000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim1, {
              toValue: 0,
              duration: 6000,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(backgroundAnim2, {
              toValue: 1,
              duration: 8000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim2, {
              toValue: 0,
              duration: 8000,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(backgroundAnim3, {
              toValue: 1,
              duration: 10000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim3, {
              toValue: 0,
              duration: 10000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };

    animateBackground();

    // Check biometric availability
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const available = await BiometricService.isAvailable();
      setBiometricAvailable(available);
      
      if (available) {
        const enabled = await BiometricService.isBiometricEnabled();
        setBiometricEnabled(enabled);
        
        const iconName = await BiometricService.getBiometricIconName();
        setBiometricIconName(iconName);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const animateFieldFocus = (fieldAnim: Animated.Value, scaleAnim: Animated.Value) => {
    Animated.timing(scaleAnim, {
      toValue: 1.02,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const animateFieldBlur = (fieldAnim: Animated.Value, scaleAnim: Animated.Value) => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Step 1: Verify password credentials without triggering 2FA yet
      beginEmailOtpFlow && beginEmailOtpFlow();
      setShowVerifyingOverlay(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Immediately sign out to avoid establishing a session before OTP
      await supabase.auth.signOut();
      endEmailOtpFlow && endEmailOtpFlow();

      // Step 2: Send Email OTP via Supabase (mandatory for all users)
      setSendingEmailOtp(true);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      setSendingEmailOtp(false);
      if (otpError) throw otpError;

      // Show Email OTP modal
      setShowEmailOtpModal(true);
      setEmailOtpCode('');
      setResendSecondsLeft(30);
      const timer = setInterval(() => {
        setResendSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timer);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      setShowVerifyingOverlay(false);
    } catch (error: any) {
      setShowVerifyingOverlay(false);
      alert(error.message);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const success = await signInWithBiometric();
      if (!success) {
        // Biometric authentication failed or was cancelled
        console.log('Biometric login failed or cancelled');
      }
    } catch (error: any) {
      console.error('Biometric login error:', error);
      alert('Biometric authentication failed. Please try again.');
    }
  };

  const handleBiometricNotEnabled = () => {
    Alert.alert(
      'Biometric Login Not Enabled',
      'Please enable biometric login in your dashboard settings to use this feature.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode || emailOtpCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code sent to your email');
      return;
    }
    try {
      setVerifyingEmailOtp(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: emailOtpCode,
        type: 'email',
      });
      setVerifyingEmailOtp(false);
      if (error) throw error;
      setShowEmailOtpModal(false);
      setEmailOtpCode('');
      // After email OTP success, auth state listener will show TOTP modal if enabled
    } catch (err: any) {
      setVerifyingEmailOtp(false);
      Alert.alert('Invalid Code', err.message || 'Failed to verify email code');
    }
  };

  const handleResendEmailOtp = async () => {
    try {
      if (resendSecondsLeft > 0) return;
      setSendingEmailOtp(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      setSendingEmailOtp(false);
      if (error) throw error;
      Alert.alert('Code Sent', 'We have resent the verification code to your email');
      setResendSecondsLeft(30);
      const timer = setInterval(() => {
        setResendSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timer);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err: any) {
      setSendingEmailOtp(false);
      Alert.alert('Error', err.message || 'Failed to resend code');
    }
  };

  const handle2FASuccess = async () => {
    try {
      if (complete2FAUsingExistingSession) {
        await complete2FAUsingExistingSession();
      } else {
        await complete2FALogin();
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handle2FACancel = () => {
    cancel2FALogin();
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleBack = () => {
    navigation.navigate('Landing');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#09d2fe" />
      </TouchableOpacity>
      
      {/* Floating Background Elements */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.floatingElement1,
          {
            transform: [
              {
                translateX: backgroundAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 30],
                }),
              },
              {
                translateY: backgroundAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 20],
                }),
              },
            ],
            opacity: backgroundAnim1.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.1, 0.2, 0.1],
            }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.floatingElement2,
          {
            transform: [
              {
                translateX: backgroundAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, -20],
                }),
              },
              {
                translateY: backgroundAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, -30],
                }),
              },
            ],
            opacity: backgroundAnim2.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.05, 0.15, 0.05],
            }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.floatingElement3,
          {
            transform: [
              {
                translateX: backgroundAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-25, 25],
                }),
              },
              {
                translateY: backgroundAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, -15],
                }),
              },
            ],
            opacity: backgroundAnim3.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.08, 0.18, 0.08],
            }),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [
                {
                  scale: logoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.logo}>
            <Image 
              source={require('../../assets/android-chrome-192x192.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
          <Animated.View 
            style={[
              styles.inputContainer, 
              emailFocused && styles.inputFocused,
              {
                opacity: emailAnim,
                transform: [
                  { translateY: emailAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })},
                  { scale: emailScaleAnim }
                ],
              }
            ]}
          >
            <View style={styles.inputIcon}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color="#09d2fe" 
              />
            </View>
              <TextInput
                style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
              onFocus={() => {
                setEmailFocused(true);
                animateFieldFocus(emailAnim, emailScaleAnim);
              }}
              onBlur={() => {
                setEmailFocused(false);
                animateFieldBlur(emailAnim, emailScaleAnim);
              }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />
          </Animated.View>

          <Animated.View 
            style={[
              styles.inputContainer, 
              passwordFocused && styles.inputFocused,
              {
                opacity: passwordAnim,
                transform: [
                  { translateY: passwordAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })},
                  { scale: passwordScaleAnim }
                ],
              }
            ]}
          >
            <View style={styles.inputIcon}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color="#09d2fe" 
              />
            </View>
              <TextInput
                style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
              onFocus={() => {
                setPasswordFocused(true);
                animateFieldFocus(passwordAnim, passwordScaleAnim);
              }}
              onBlur={() => {
                setPasswordFocused(false);
                animateFieldBlur(passwordAnim, passwordScaleAnim);
              }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
          </Animated.View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Animated.View 
                  style={[
                    styles.spinner,
                    {
                      transform: [
                        {
                          rotate: spinnerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]} 
                />
                <Text style={styles.loginButtonText}>Signing In...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Biometric Login Button */}
          {biometricAvailable && (
            <View style={styles.biometricContainer}>
              <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  !biometricEnabled && styles.biometricButtonDisabled
                ]}
                onPress={biometricEnabled ? handleBiometricLogin : handleBiometricNotEnabled}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={biometricIconName} 
                  size={32} 
                  color={biometricEnabled ? "#09d2fe" : "#6b7280"} 
                />
                <Text style={[
                  styles.biometricButtonText,
                  !biometricEnabled && styles.biometricButtonTextDisabled
                ]}>
                  {biometricEnabled ? 'Sign in with biometric' : 'Biometric not enabled'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.signUpLink}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpText}>
              Don't have an account?{' '}
              <Text style={styles.signUpTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
      </Animated.View>

      {/* 2FA Verification Modal */}
      <OTPVerification
        visible={pending2FA?.show || false}
        onClose={handle2FACancel}
        onSuccess={handle2FASuccess}
        action="login"
        title="Complete Login"
        description="Please verify your identity with 2FA to continue"
        userId={pending2FA?.userId}
      />

      {/* Email OTP Modal (mandatory step after password) */}
      <Modal visible={showEmailOtpModal} transparent animationType="fade" onRequestClose={() => setShowEmailOtpModal(false)}>
        <KeyboardAvoidingView
          style={styles.emailModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={styles.emailModalContainer}>
            <Text style={styles.emailModalTitle}>Verify your email</Text>
            <Text style={styles.emailModalDesc}>Enter the 6-digit code sent to {email}</Text>

            {/* Hidden input captures digits */}
            <TextInput
              ref={hiddenEmailInputRef}
              value={emailOtpCode}
              onChangeText={(t) => setEmailOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              style={styles.hiddenInput}
            />

            {/* Code boxes */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => hiddenEmailInputRef.current?.focus()}>
              <View style={styles.codeBoxesRow}>
                {Array.from({ length: 6 }).map((_, idx) => {
                  const char = emailOtpCode[idx] || '';
                  const isFilled = idx < emailOtpCode.length;
                  const isActive = idx === Math.min(emailOtpCode.length, 5);
                  return (
                    <View key={idx} style={[styles.codeBox, isFilled && styles.codeBoxFilled, isActive && styles.codeBoxActive]}>
                      <Text style={styles.codeBoxText}>{char}</Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>

            <View style={styles.pasteRow}>
              <TouchableOpacity onPress={handlePasteEmailOtp} style={styles.pasteButton} activeOpacity={0.85}>
                <Ionicons name="clipboard-outline" size={18} color="#09d2fe" />
                <Text style={styles.pasteButtonText}>Paste</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.emailVerifyBtn, verifyingEmailOtp && styles.emailVerifyBtnDisabled]} onPress={handleVerifyEmailOtp} disabled={verifyingEmailOtp}>
              {verifyingEmailOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.emailVerifyBtnText}>Verify</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.emailResendBtn} onPress={handleResendEmailOtp} disabled={sendingEmailOtp || resendSecondsLeft > 0}>
              <Text style={styles.emailResendText}>
                {sendingEmailOtp
                  ? 'Resending…'
                  : resendSecondsLeft > 0
                  ? `Resend in ${resendSecondsLeft}s`
                  : 'Resend code'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emailCancelBtn} onPress={() => setShowEmailOtpModal(false)} disabled={verifyingEmailOtp}>
              <Text style={styles.emailCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Verifying overlay to smooth the transition */}
      <Modal visible={showVerifyingOverlay} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.verifyingOverlay}>
          <View style={styles.verifyingCard}>
            <ActivityIndicator size="large" color="#09d2fe" />
            <Text style={styles.verifyingText}>Verifying…</Text>
          </View>
        </View>
      </Modal>
        </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    zIndex: 10,
  },
  floatingElement1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#09d2fe',
    top: '15%',
    left: '10%',
    zIndex: 0,
  },
  floatingElement2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#09d2fe',
    top: '70%',
    right: '15%',
    zIndex: 0,
  },
  floatingElement3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#09d2fe',
    bottom: '15%',
    left: '20%',
    zIndex: 0,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#09d2fe',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    zIndex: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    zIndex: 3,
  },
  inputFocused: {
    borderColor: '#09d2fe',
    shadowColor: '#09d2fe',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    zIndex: 4,
  },
  loginButton: {
    backgroundColor: '#09d2fe',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#09d2fe',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderTopColor: 'transparent',
    marginRight: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpLink: {
    alignItems: 'center',
    zIndex: 3,
  },
  signUpText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  signUpTextBold: {
    color: '#09d2fe',
    fontWeight: '600',
  },
  biometricContainer: {
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  orText: {
    color: '#6b7280',
    fontSize: 14,
    marginHorizontal: 15,
    fontWeight: '500',
  },
  biometricButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#09d2fe',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  biometricButtonText: {
    color: '#09d2fe',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  biometricButtonDisabled: {
    borderColor: '#6b7280',
    opacity: 0.7,
  },
  biometricButtonTextDisabled: {
    color: '#6b7280',
  },
  emailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emailModalContainer: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  emailModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emailModalDesc: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  emailOtpInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 24,
    color: '#ffffff',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    letterSpacing: 8,
    marginBottom: 12,
  },
  emailVerifyBtn: {
    backgroundColor: '#09d2fe',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  emailVerifyBtnDisabled: {
    opacity: 0.7,
  },
  emailVerifyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emailResendBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  emailResendText: {
    color: '#09d2fe',
    fontSize: 12,
    fontWeight: '500',
  },
  emailCancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  emailCancelText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  pasteRow: {
    alignItems: 'flex-end',
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
  verifyingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  verifyingText: {
    color: '#e5e7eb',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
});

export default LoginScreen; 