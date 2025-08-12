import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Image,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

type DepositPKRNavigationProp = StackNavigationProp<RootStackParamList, 'DepositPKR'>;

interface BankAccount {
  id: string;
  bank_name: string;
  account_title: string;
  account_iban: string;
  is_active: boolean;
}

const DepositPKRScreen: React.FC = () => {
  const navigation = useNavigation<DepositPKRNavigationProp>();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const successOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadBankAccounts();
    animateEntrance();
  }, []);

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
      toValue: step === 1 ? 0.5 : 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const showCustomNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    
    Animated.sequence([
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(notificationAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowNotification(false);
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setString(text);
      showCustomNotification(`${label} copied to clipboard`);
    } catch (error) {
      showCustomNotification('Failed to copy');
    }
  };

  const triggerSuccessAnimation = () => {
    setShowSuccessAnimation(true);
    
    Animated.sequence([
      // Scale up with bounce
      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      // Fade in
      Animated.timing(successOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Hold for 3 seconds
      Animated.delay(3000),
      // Fade out
      Animated.timing(successOpacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessAnimation(false);
      successScaleAnim.setValue(0);
      successOpacityAnim.setValue(0);
      navigation.navigate('Home');
    });
  };

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      Alert.alert('Error', 'Failed to load bank accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      if (!selectedBank) {
        Alert.alert('Error', 'Please select a bank account');
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  };

  const pickScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const submitDeposit = async () => {
    if (!screenshot) {
      Alert.alert('Error', 'Please upload a payment screenshot');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot
      const fileName = `${user?.uid}/deposit_${Date.now()}.jpg`;
      
      // Read the file as base64
      const screenshotBase64 = await FileSystem.readAsStringAsync(screenshot, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer for proper upload
      const binaryString = atob(screenshotBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(fileName);
      const screenshotUrl = urlData.publicUrl;
      console.log('Generated screenshot URL:', screenshotUrl);

      // Create deposit record
      const { error: insertError } = await supabase
        .from('pkr_deposits')
        .insert({
          user_id: user?.uid,
          amount: parseFloat(amount),
          bank_account_id: selectedBank?.id,
          screenshot_url: screenshotUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      // Show custom success animation
      triggerSuccessAnimation();

    } catch (error) {
      console.error('Error submitting deposit:', error);
      Alert.alert('Error', 'Failed to submit deposit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const BankAccountCard: React.FC<{
    bank: BankAccount;
    isSelected: boolean;
    onSelect: () => void;
  }> = ({ bank, isSelected, onSelect }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onSelect}
        activeOpacity={0.9}
      >
        <Animated.View style={[
          styles.bankCard,
          {
            transform: [{ scale: scaleAnim }],
            borderColor: isSelected ? '#09d2fe' : '#333333',
            backgroundColor: isSelected ? '#1a1a1a' : '#000000',
          }
        ]}>
          <View style={styles.bankCardHeader}>
            <Ionicons 
              name="business" 
              size={24} 
              color={isSelected ? '#09d2fe' : '#666666'} 
            />
            <View style={styles.bankInfo}>
              <Text style={[styles.bankName, { color: isSelected ? '#09d2fe' : '#ffffff' }]}>
                {bank.bank_name}
              </Text>
              <Text style={styles.accountTitle}>{bank.account_title}</Text>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color="#09d2fe" />
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading bank accounts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Custom Notification */}
      {showNotification && (
        <Animated.View 
          style={[
            styles.notification,
            {
              transform: [{ translateY: notificationAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <Animated.View 
          style={[
            styles.successOverlay,
            {
              opacity: successOpacityAnim,
            },
          ]}
        >
          <Animated.View 
            style={[
              styles.successCard,
              {
                transform: [{ scale: successScaleAnim }],
              },
            ]}
          >
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>Deposit Submitted!</Text>
            <Text style={styles.successMessage}>
              Your deposit request has been submitted successfully.
            </Text>
            <Text style={styles.successSubtext}>
              It will be verified and deposited within 15-30 minutes.
            </Text>
            <View style={styles.successProgress}>
              <Animated.View 
                style={[
                  styles.successProgressBar,
                  {
                    transform: [{
                      scaleX: successOpacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    }],
                  },
                ]} 
              />
            </View>
          </Animated.View>
        </Animated.View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Deposit PKR' : 'Payment Details'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              })}
            ]} 
          />
        </View>
        <Text style={styles.progressText}>Step {step} of 2</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {step === 1 ? (
            // Step 1: Amount and Bank Selection
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Enter Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₨</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Bank Account</Text>
                <Text style={styles.sectionSubtitle}>
                  Choose a bank account to deposit to
                </Text>
                
                {bankAccounts.map((bank) => (
                  <BankAccountCard
                    key={bank.id}
                    bank={bank}
                    isSelected={selectedBank?.id === bank.id}
                    onSelect={() => setSelectedBank(bank)}
                  />
                ))}
              </View>
            </>
          ) : (
            // Step 2: Payment Details and Screenshot
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                <View style={styles.paymentDetailsCard}>
                  <View style={styles.paymentHeader}>
                    <Ionicons name="card" size={24} color="#09d2fe" />
                    <Text style={styles.paymentHeaderText}>Transfer Details</Text>
                  </View>
                  
                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>Amount to Transfer</Text>
                    <Text style={styles.amountDisplay}>₨{amount}</Text>
                  </View>
                  
                  <View style={styles.bankInfoSection}>
                    <View style={styles.bankHeader}>
                      <Ionicons name="business" size={20} color="#09d2fe" />
                      <Text style={styles.bankHeaderText}>Bank Information</Text>
                    </View>
                    
                    <View style={styles.bankDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Bank Name</Text>
                        <Text style={styles.detailValue}>{selectedBank?.bank_name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Title</Text>
                        <Text style={styles.detailValue}>{selectedBank?.account_title}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Number</Text>
                        <View style={styles.detailValueContainer}>
                          <Text style={styles.detailValue}>{selectedBank?.account_iban}</Text>
                          <TouchableOpacity 
                            style={styles.copyButton}
                            onPress={() => copyToClipboard(selectedBank?.account_iban || '', 'Account Number')}
                          >
                            <Ionicons name="copy-outline" size={18} color="#09d2fe" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.instructionSection}>
                    <Ionicons name="information-circle" size={20} color="#f59e0b" />
                    <Text style={styles.instructionText}>
                      Please transfer exactly ₨{amount} to the account above and upload the payment screenshot below.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upload Payment Screenshot</Text>
                <Text style={styles.sectionSubtitle}>
                  Please upload a screenshot of your payment confirmation
                </Text>
                
                <TouchableOpacity 
                  style={styles.uploadButton} 
                  onPress={pickScreenshot}
                  disabled={isSubmitting}
                >
                  {screenshot ? (
                    <View style={styles.screenshotPreview}>
                      <Image source={{ uri: screenshot }} style={styles.screenshotImage} />
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => setScreenshot(null)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="camera" size={48} color="#666666" />
                      <Text style={styles.uploadText}>Tap to upload screenshot</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        {step === 1 ? (
          <TouchableOpacity 
            style={[
              styles.nextButton,
              (!amount || !selectedBank) && styles.disabledButton
            ]} 
            onPress={handleNext}
            disabled={!amount || !selectedBank}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!screenshot || isSubmitting) && styles.disabledButton
            ]} 
            onPress={submitDeposit}
            disabled={!screenshot || isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Deposit</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#09d2fe',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#09d2fe',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  bankCard: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  accountTitle: {
    fontSize: 14,
    color: '#666666',
  },
  paymentDetailsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  paymentHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  amountSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#09d2fe',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  amountDisplay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#09d2fe',
  },
  bankInfoSection: {
    marginBottom: 20,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  bankDetails: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  instructionSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  instructionText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  detailLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  uploadButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
  },
  screenshotPreview: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  nextButton: {
    backgroundColor: '#09d2fe',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#333333',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
  notification: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  successCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 300,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  successProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  successProgressBar: {
    height: '100%',
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
    transformOrigin: 'left',
  },
});

export default DepositPKRScreen; 