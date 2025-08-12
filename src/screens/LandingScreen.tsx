import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

const { width, height } = Dimensions.get('window');

type LandingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Landing'>;

const LandingScreen: React.FC = () => {
  const navigation = useNavigation<LandingScreenNavigationProp>();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const backgroundAnim1 = useRef(new Animated.Value(0)).current;
  const backgroundAnim2 = useRef(new Animated.Value(0)).current;
  const backgroundAnim3 = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Main entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();

    // Background 3D movement animations
    const animateBackground = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(backgroundAnim1, {
              toValue: 1,
              duration: 8000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim1, {
              toValue: 0,
              duration: 8000,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(backgroundAnim2, {
              toValue: 1,
              duration: 12000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim2, {
              toValue: 0,
              duration: 12000,
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

    // Logo pulse animation
    const animateLogo = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateBackground();
    animateLogo();
  }, []);

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 3D Background Elements */}
      <Animated.View
        style={[
          styles.backgroundElement1,
          {
            transform: [
              {
                translateX: backgroundAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 50],
                }),
              },
              {
                translateY: backgroundAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 30],
                }),
              },
              {
                rotate: backgroundAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
            opacity: backgroundAnim1.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.1, 0.3, 0.1],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundElement2,
          {
            transform: [
              {
                translateX: backgroundAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, -30],
                }),
              },
              {
                translateY: backgroundAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, -40],
                }),
              },
              {
                rotate: backgroundAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['360deg', '0deg'],
                }),
              },
            ],
            opacity: backgroundAnim2.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.05, 0.2, 0.05],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundElement3,
          {
            transform: [
              {
                translateX: backgroundAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, 40],
                }),
              },
              {
                translateY: backgroundAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, -20],
                }),
              },
              {
                rotate: backgroundAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
            opacity: backgroundAnim3.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.08, 0.25, 0.08],
            }),
          },
        ]}
      />

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideUpAnim },
            ],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logo,
              {
                opacity: logoAnim,
                transform: [
                  {
                    rotate: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image 
              source={require('../../assets/android-chrome-192x192.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Pakistan's Most Trusted</Text>
          <Text style={styles.taglineHighlight}>P2P Crypto Platform</Text>
          <Text style={styles.subtitle}>
            Trade USDT with PKR instantly via JazzCash, EasyPaisa, Bank Transfer & Raast
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Don't have an account?
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backgroundElement1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#09d2fe',
    top: '20%',
    left: '10%',
  },
  backgroundElement2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#09d2fe',
    top: '60%',
    right: '15%',
  },
  backgroundElement3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#09d2fe',
    bottom: '20%',
    left: '20%',
  },
  floatingElement1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#09d2fe',
    top: '10%',
    left: '5%',
    zIndex: 0,
  },
  floatingElement2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#09d2fe',
    top: '60%',
    right: '10%',
    zIndex: 0,
  },
  floatingElement3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#09d2fe',
    bottom: '10%',
    left: '15%',
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
    marginBottom: 40,
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
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  taglineHighlight: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#09d2fe',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#09d2fe',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#09d2fe',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#09d2fe',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
  },
  signInButtonText: {
    color: '#09d2fe',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LandingScreen; 