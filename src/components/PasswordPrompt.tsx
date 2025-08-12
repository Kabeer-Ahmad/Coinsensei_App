import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordPromptProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: (password: string) => Promise<boolean>;
  onCancel: () => void;
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onConfirm(password);
      if (success) {
        setPassword('');
        // onConfirm should handle the modal closing
      }
    } catch (error) {
      console.error('Password prompt error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableOpacity 
          style={styles.backdropTouch} 
          activeOpacity={1} 
          onPress={handleCancel}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.container}>
                <View style={styles.header}>
                  <Ionicons name="lock-closed" size={32} color="#09d2fe" />
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.message}>{message}</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor="#6b7280"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoFocus={true}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
                    onPress={handleConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
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
    borderRadius: 20,
    padding: width < 400 ? 16 : 24,
    width: width > 400 ? 400 : width * 0.9,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: width < 400 ? 18 : 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#9ca3af',
    fontSize: width < 400 ? 13 : 14,
    textAlign: 'center',
    lineHeight: width < 400 ? 18 : 20,
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
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#09d2fe',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PasswordPrompt;