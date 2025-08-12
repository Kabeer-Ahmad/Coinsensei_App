import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

type ChangePasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ChangePassword'>;

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<ChangePasswordNavigationProp>();
  const { user } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    // Animate entrance
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

  }, []);

  const validateInputs = () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirmation do not match');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      console.log('Attempting to change password...');

      // Get current user session
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('No authenticated user found');
      }

      // For security, we'll proceed directly with password update
      // Supabase Auth handles the current session validation
      console.log('Updating password for authenticated user...');

      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        
        // Handle specific error cases
        if (updateError.message.includes('Password should be')) {
          Alert.alert('Error', 'Password does not meet security requirements');
          return;
        } else if (updateError.message.includes('User not found') || updateError.message.includes('Invalid user')) {
          Alert.alert('Error', 'Please sign in again and try updating your password');
          return;
        }
        
        throw updateError;
      }

      console.log('Password updated successfully');

      Alert.alert(
        'Success',
        'Your password has been changed successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setNewPassword('');
              setConfirmPassword('');
              navigation.goBack();
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Change password error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to change password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.formContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={48} color="#09d2fe" />
          </View>
          
          <Text style={styles.title}>Change Your Password</Text>
          <Text style={styles.subtitle}>
            Choose a new secure password for your account
          </Text>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min 6 characters)"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Password Security Tips:</Text>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.tipText}>Use at least 8 characters</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.tipText}>Include uppercase and lowercase letters</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.tipText}>Add numbers and special characters</Text>
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={[styles.changeButton, isLoading && styles.changeButtonDisabled]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
                <Text style={styles.changeButtonText}>Change Password</Text>
              </>
            )}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  formContainer: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  passwordInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 16,
  },
  tipsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#09d2fe',
  },
  tipsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    color: '#9ca3af',
    fontSize: 14,
    marginLeft: 8,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09d2fe',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 'auto',
    marginBottom: 40,
  },
  changeButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  changeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ChangePasswordScreen;