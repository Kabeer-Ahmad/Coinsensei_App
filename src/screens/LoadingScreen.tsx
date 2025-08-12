import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoadingScreen: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    
    pulse();
  }, []);

  return (
    <SafeAreaView style={styles.loadingContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.loadingContent}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim }
              ]
            }
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

        {/* Loading Spinner */}
        <Animated.View
          style={[
            styles.spinnerContainer,
            { opacity: fadeAnim }
          ]}
        >
          <ActivityIndicator size="large" color="#09d2fe" />
          <Text style={styles.loadingText}>Authenticating...</Text>
        </Animated.View>

        {/* Status Message */}
        <Animated.View
          style={[
            styles.statusContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.statusText}>Securing your connection</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
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
  spinnerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});

export default LoadingScreen; 