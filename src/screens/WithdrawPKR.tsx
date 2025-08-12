import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../config/supabase';
import { UserBankAccount, PKRWithdrawal, RootStackParamList } from '../types';
import { useRefreshControl } from '../hooks/useRefreshControl';

type NavigationProp = StackNavigationProp<RootStackParamList, 'WithdrawPKR'>;

export default function WithdrawPKR() {
  const navigation = useNavigation<NavigationProp>();
  const [amount, setAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState<UserBankAccount | null>(null);
  const [bankAccounts, setBankAccounts] = useState<UserBankAccount[]>([]);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const { isRefreshing, handleRefresh } = useRefreshControl();

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    await Promise.all([
      fetchBankAccounts(),
      fetchUserBalance(),
    ]);
  };

  const onRefresh = async () => {
    await handleRefresh(fetchUserData);
  };

  const fetchBankAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        return;
      }

      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wallets')
        .select('pkr_balance, pkr_locked')
        .eq('uid', user.id)
        .single();

      if (error) {
        console.error('Error fetching user balance:', error);
        return;
      }

      // PKR balance already represents available balance
      setUserBalance(data?.pkr_balance || 0);
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedBankAccount) {
      Alert.alert('Error', 'Please select a bank account');
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (withdrawalAmount > userBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (withdrawalAmount < 100) {
      Alert.alert('Error', 'Minimum withdrawal amount is Rs. 100');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Process withdrawal using RPC function
      const { data: processResult, error: processError } = await supabase
        .rpc('process_pkr_withdrawal', {
          user_id: user.id,
          withdrawal_amount: withdrawalAmount
        });

      if (processError || !processResult) {
        console.error('Error processing withdrawal:', processError);
        Alert.alert('Error', 'Failed to process withdrawal. Please check your balance.');
        return;
      }

      // Create withdrawal request record
      const { error: withdrawalError } = await supabase
        .from('pkr_withdrawals')
        .insert({
          user_id: user.id,
          user_bank_account_id: selectedBankAccount.id,
          amount: withdrawalAmount,
        });

      if (withdrawalError) {
        console.error('Error creating withdrawal request:', withdrawalError);
        Alert.alert('Error', 'Failed to create withdrawal request');
        return;
      }

      // Show custom success animation
      setShowSuccessAnimation(true);
      
      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Start progress animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: false,
      }).start();

      // Start rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
      
      // Hide animation after 3 seconds and navigate back
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowSuccessAnimation(false);
          setAmount('');
          setSelectedBankAccount(null);
          navigation.goBack();
        });
      }, 3000);
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      Alert.alert('Error', 'Failed to create withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const selectBankAccount = (account: UserBankAccount) => {
    setSelectedBankAccount(account);
    setShowBankDropdown(false);
  };

  const getBankIcon = (bankName: string) => {
    const name = bankName.toLowerCase();
    if (name.includes('jazz')) return 'phone-portrait';
    if (name.includes('easypaisa') || name.includes('telenor')) return 'card';
    if (name.includes('hbl')) return 'business';
    if (name.includes('ubl')) return 'business';
    if (name.includes('mcb')) return 'business';
    if (name.includes('abl')) return 'business';
    if (name.includes('nbp')) return 'business';
    if (name.includes('meezan')) return 'business';
    return 'business';
  };

  const renderBankAccountItem = ({ item }: { item: UserBankAccount }) => (
    <TouchableOpacity
      style={styles.bankAccountItem}
      onPress={() => selectBankAccount(item)}
    >
      <View style={styles.bankAccountContent}>
        <View style={styles.bankAccountIcon}>
          <Ionicons
            name={getBankIcon(item.bank_name) as any}
            size={20}
            color="#09d2fe"
          />
        </View>
        <View style={styles.bankAccountInfo}>
          <Text style={styles.bankAccountName}>{item.bank_name}</Text>
          <Text style={styles.bankAccountTitle}>{item.account_title}</Text>
          <Text style={styles.bankAccountIban}>{item.account_iban}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <Animated.View
          style={[
            styles.successOverlay,
            {
              opacity: opacityAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.successContent,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Success Icon */}
            <Animated.View
              style={[
                styles.successIconContainer,
                {
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={80} color="#10b981" />
            </Animated.View>
            
            {/* Success Text */}
            <Text style={styles.successTitle}>Withdrawal Submitted!</Text>
            <Text style={styles.successSubtitle}>
              Your withdrawal request has been submitted successfully
            </Text>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            
            <Text style={styles.processingText}>Processing...</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#09d2fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw PKR</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#09d2fe"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>Rs. {userBalance.toLocaleString()}</Text>
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Withdrawal Amount *</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>Rs.</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.inputHint}>Minimum: Rs. 100</Text>
        </View>

        {/* Bank Account Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bank Account *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              if (bankAccounts.length === 0) {
                Alert.alert(
                  'No Bank Accounts',
                  'Please add a bank account first to withdraw funds.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Add Bank Account',
                      onPress: () => navigation.navigate('UserBankAccounts'),
                    },
                  ]
                );
                return;
              }
              setShowBankDropdown(true);
            }}
          >
            {selectedBankAccount ? (
              <View style={styles.selectedBankInfo}>
                <View style={styles.selectedBankIcon}>
                  <Ionicons
                    name={getBankIcon(selectedBankAccount.bank_name) as any}
                    size={16}
                    color="#09d2fe"
                  />
                </View>
                <Text style={styles.selectedBankText}>
                  {selectedBankAccount.bank_name} - {selectedBankAccount.account_title}
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                Select bank account
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            (!selectedBankAccount || !amount || loading) && styles.withdrawButtonDisabled
          ]}
          onPress={handleWithdraw}
          disabled={!selectedBankAccount || !amount || loading}
        >
          {loading ? (
            <Text style={styles.withdrawButtonText}>Processing...</Text>
          ) : (
            <Text style={styles.withdrawButtonText}>Withdraw PKR</Text>
          )}
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Withdrawal Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Processing time: 15-30 minutes</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Minimum withdrawal: Rs. 100</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="card-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Funds will be sent to your selected bank account</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bank Account Selection Modal */}
      <Modal
        visible={showBankDropdown}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBankDropdown(false)}
            >
              <Ionicons name="close" size={24} color="#09d2fe" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Bank Account</Text>
            <View style={styles.placeholder} />
          </View>

          <FlatList
            data={bankAccounts}
            renderItem={renderBankAccountItem}
            keyExtractor={(item) => item.id}
            style={styles.bankAccountList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#09d2fe',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#fff',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    color: '#fff',
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectedBankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedBankIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedBankText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  withdrawButton: {
    backgroundColor: '#09d2fe',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  withdrawButtonDisabled: {
    opacity: 0.5,
  },
  withdrawButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  bankAccountList: {
    flex: 1,
  },
  bankAccountItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  bankAccountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankAccountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankAccountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  bankAccountTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  bankAccountIban: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  // Success Animation Styles
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successContent: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    maxWidth: 300,
    width: '80%',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  processingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
}); 