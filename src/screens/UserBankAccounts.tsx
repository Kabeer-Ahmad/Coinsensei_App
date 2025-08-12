import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../config/supabase';
import { UserBankAccount, RootStackParamList } from '../types';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { useAuth } from '../context/AuthContext';
import OTPVerification from './OTPVerification';

type NavigationProp = StackNavigationProp<RootStackParamList, 'UserBankAccounts'>;

export default function UserBankAccounts() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<UserBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { isRefreshing, handleRefresh } = useRefreshControl();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchBankAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        return;
      }

      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await handleRefresh(fetchBankAccounts);
  };

  const deleteBankAccount = async (accountId: string) => {
    Alert.alert(
      'Delete Bank Account',
      'Are you sure you want to delete this bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Check if user has 2FA enabled
            if (user?.two_factor_enabled) {
              // Store delete ID and show 2FA modal
              setPendingDeleteId(accountId);
              setShow2FAModal(true);
            } else {
              // No 2FA required, proceed with delete
              performDelete(accountId);
            }
          },
        },
      ]
    );
  };

  const performDelete = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting bank account:', error);
        Alert.alert('Error', 'Failed to delete bank account');
        return;
      }

      setBankAccounts(prev => prev.filter(account => account.id !== accountId));
    } catch (error) {
      console.error('Error deleting bank account:', error);
      Alert.alert('Error', 'Failed to delete bank account');
    }
  };

  const handle2FASuccess = async () => {
    if (pendingDeleteId) {
      setShow2FAModal(false);
      await performDelete(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const handle2FACancel = () => {
    setShow2FAModal(false);
    setPendingDeleteId(null);
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#09d2fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bank Accounts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEditBankAccount', {})}
        >
          <Ionicons name="add" size={24} color="#09d2fe" />
        </TouchableOpacity>
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
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading bank accounts...</Text>
          </View>
        ) : bankAccounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No Bank Accounts</Text>
            <Text style={styles.emptySubtitle}>
              Add your bank account details to receive PKR withdrawals
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => navigation.navigate('AddEditBankAccount', {})}
            >
              <Text style={styles.addFirstButtonText}>Add Bank Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {bankAccounts.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <View style={styles.bankInfo}>
                    <View style={styles.bankIconContainer}>
                      <Ionicons
                        name={getBankIcon(account.bank_name) as any}
                        size={20}
                        color="#09d2fe"
                      />
                    </View>
                    <View style={styles.bankDetails}>
                      <Text style={styles.bankName}>{account.bank_name}</Text>
                      <Text style={styles.accountTitle}>{account.account_title}</Text>
                    </View>
                  </View>
                  <View style={styles.accountActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => navigation.navigate('AddEditBankAccount', { bankAccount: account })}
                    >
                      <Ionicons name="create-outline" size={18} color="#09d2fe" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteBankAccount(account.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff4757" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.accountNumberContainer}>
                  <Text style={styles.accountNumberLabel}>Account/IBAN:</Text>
                  <Text style={styles.accountNumber}>{account.account_iban}</Text>
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, account.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusText, account.is_active ? styles.activeText : styles.inactiveText]}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 2FA Verification Modal */}
      <OTPVerification
        visible={show2FAModal}
        onClose={handle2FACancel}
        onSuccess={handle2FASuccess}
        action="delete_bank"
        title="Delete Bank Account"
        description="Please verify your identity with 2FA to delete this bank account"
      />
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
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  addFirstButton: {
    backgroundColor: '#09d2fe',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  accountsList: {
    padding: 20,
  },
  accountCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankDetails: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  accountTitle: {
    fontSize: 14,
    color: '#999',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  accountNumberContainer: {
    marginBottom: 12,
  },
  accountNumberLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: 'rgba(9, 210, 254, 0.1)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#09d2fe',
  },
  inactiveText: {
    color: '#ff4757',
  },
}); 