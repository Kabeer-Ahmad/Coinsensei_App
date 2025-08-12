import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { signUp, loading } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim1 = useRef(new Animated.Value(0)).current;
  const backgroundAnim2 = useRef(new Animated.Value(0)).current;
  const backgroundAnim3 = useRef(new Animated.Value(0)).current;
  
  // Field animation values
  const fullNameAnim = useRef(new Animated.Value(0)).current;
  const emailAnim = useRef(new Animated.Value(0)).current;
  const passwordAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordAnim = useRef(new Animated.Value(0)).current;
  const fullNameScaleAnim = useRef(new Animated.Value(1)).current;
  const emailScaleAnim = useRef(new Animated.Value(1)).current;
  const passwordScaleAnim = useRef(new Animated.Value(1)).current;
  const confirmPasswordScaleAnim = useRef(new Animated.Value(1)).current;
  
  // Progress and strength animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const strengthAnim = useRef(new Animated.Value(0)).current;

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
    Animated.stagger(150, [
      Animated.timing(fullNameAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
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
      Animated.timing(confirmPasswordAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

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
  }, []);

  // Animate progress bar when fields are filled
  useEffect(() => {
    const progressStep = getProgressStep();
    Animated.timing(progressAnim, {
      toValue: progressStep / 4,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [fullName, email, password, confirmPassword]);

  // Animate password strength bar
  useEffect(() => {
    if (password.length > 0) {
      Animated.timing(strengthAnim, {
        toValue: getPasswordStrength().strength / 4,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [password]);

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

  const validateForm = () => {
    if (!fullName.trim()) {
      alert('Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      alert('Please enter your email address');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      alert('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      await signUp(email.trim(), password, fullName.trim());
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleBack = () => {
    navigation.navigate('Landing');
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { strength: 0, color: '#94a3b8', text: '' };
    if (password.length < 6) return { strength: 1, color: '#ef4444', text: 'Weak' };
    if (password.length < 8) return { strength: 2, color: '#f59e0b', text: 'Fair' };
    if (password.length < 10) return { strength: 3, color: '#09d2fe', text: 'Good' };
    return { strength: 4, color: '#10b981', text: 'Strong' };
  };

  const getProgressStep = () => {
    let steps = 0;
    if (fullName.trim()) steps++;
    if (email.trim() && /\S+@\S+\.\S+/.test(email)) steps++;
    if (password.length >= 6) steps++;
    if (password === confirmPassword && password.length >= 6) steps++;
    return steps;
  };

  const passwordStrength = getPasswordStrength();
  const progressStep = getProgressStep();

  return (
    <SafeAreaView style={styles.container}>
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

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join COINSENSEI today</Text>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: passwordStrength.color
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Step {progressStep} of 4</Text>
        </View>

        <View style={styles.form}>
          <Animated.View 
            style={[
              styles.inputContainer, 
              fullNameFocused && styles.inputFocused,
              {
                opacity: fullNameAnim,
                transform: [
                  { translateY: fullNameAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })},
                  { scale: fullNameScaleAnim }
                ],
              }
            ]}
          >
            <Ionicons 
              name="person-outline" 
              size={20} 
              color="#09d2fe" 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#94a3b8"
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => {
                setFullNameFocused(true);
                animateFieldFocus(fullNameAnim, fullNameScaleAnim);
              }}
              onBlur={() => {
                setFullNameFocused(false);
                animateFieldBlur(fullNameAnim, fullNameScaleAnim);
              }}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {fullName.trim() && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </Animated.View>

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
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color="#09d2fe" 
              style={styles.inputIcon}
            />
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
            {email.trim() && /\S+@\S+\.\S+/.test(email) && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
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
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color="#09d2fe" 
              style={styles.inputIcon}
            />
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
            {password.length >= 6 && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </Animated.View>

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <Animated.View 
              style={[
                styles.passwordStrengthContainer,
                {
                  opacity: strengthAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                }
              ]}
            >
              <View style={styles.strengthBar}>
                <Animated.View 
                  style={[
                    styles.strengthFill, 
                    { 
                      width: strengthAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: passwordStrength.color
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                {passwordStrength.text}
              </Text>
            </Animated.View>
          )}

          <Animated.View 
            style={[
              styles.inputContainer, 
              confirmPasswordFocused && styles.inputFocused,
              {
                opacity: confirmPasswordAnim,
                transform: [
                  { translateY: confirmPasswordAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })},
                  { scale: confirmPasswordScaleAnim }
                ],
              }
            ]}
          >
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color="#09d2fe" 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="#94a3b8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => {
                setConfirmPasswordFocused(true);
                animateFieldFocus(confirmPasswordAnim, confirmPasswordScaleAnim);
              }}
              onBlur={() => {
                setConfirmPasswordFocused(false);
                animateFieldBlur(confirmPasswordAnim, confirmPasswordScaleAnim);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {password === confirmPassword && password.length >= 6 && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </Animated.View>

          <TouchableOpacity
            style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Animated.View style={styles.spinner} />
                <Text style={styles.signUpButtonText}>Creating Account...</Text>
              </View>
            ) : (
              <Text style={styles.signUpButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 20,
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
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
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
  passwordStrengthContainer: {
    marginBottom: 16,
  },
  strengthBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  signUpButton: {
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
  signUpButtonDisabled: {
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
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    zIndex: 3,
  },
  loginText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  loginTextBold: {
    color: '#09d2fe',
    fontWeight: '600',
  },
});

export default SignUpScreen; 