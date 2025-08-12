import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../config/supabase';
import { UserBankAccount, PakistaniBank, RootStackParamList } from '../types';
import { TwoFactorService } from '../services/twoFactorService';
import OTPVerification from './OTPVerification';
import { useAuth } from '../context/AuthContext';

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddEditBankAccount'>;
type RouteProp = RouteProp<RootStackParamList, 'AddEditBankAccount'>;

export default function AddEditBankAccount() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { bankAccount } = route.params || {};
  const { user } = useAuth();

  const [bankName, setBankName] = useState(bankAccount?.bank_name || '');
  const [accountTitle, setAccountTitle] = useState(bankAccount?.account_title || '');
  const [accountIban, setAccountIban] = useState(bankAccount?.account_iban || '');
  const [isActive, setIsActive] = useState(bankAccount?.is_active ?? true);
  
  const [pakistaniBanks, setPakistaniBanks] = useState<PakistaniBank[]>([]);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredBanks, setFilteredBanks] = useState<PakistaniBank[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);

  const isEditing = !!bankAccount;

  useEffect(() => {
    fetchPakistaniBanks();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBanks(pakistaniBanks);
    } else {
      const filtered = pakistaniBanks.filter(bank =>
        bank.bank_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBanks(filtered);
    }
  }, [searchQuery, pakistaniBanks]);

  const fetchPakistaniBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('pakistani_banks')
        .select('*')
        .order('bank_name');

      if (error) {
        console.error('Error fetching Pakistani banks:', error);
        return;
      }

      setPakistaniBanks(data || []);
      setFilteredBanks(data || []);
    } catch (error) {
      console.error('Error fetching Pakistani banks:', error);
    }
  };

  const handleSave = async () => {
    if (!bankName.trim()) {
      Alert.alert('Error', 'Please select a bank');
      return;
    }

    if (!accountTitle.trim()) {
      Alert.alert('Error', 'Please enter account title');
      return;
    }

    if (!accountIban.trim()) {
      Alert.alert('Error', 'Please enter account/IBAN number');
      return;
    }

    // Check if user has 2FA enabled
    if (user?.two_factor_enabled) {
      // Store save data and show 2FA modal
      setPendingSaveData({
        bankName,
        accountTitle,
        accountIban,
        isActive,
        isEditing,
        bankAccountId: bankAccount?.id
      });
      setShow2FAModal(true);
      return;
    }

    // No 2FA required, proceed with save
    await performSave();
  };

  const performSave = async () => {
    setLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const saveData = pendingSaveData || {
        bankName,
        accountTitle,
        accountIban,
        isActive,
        isEditing,
        bankAccountId: bankAccount?.id
      };

      if (saveData.isEditing) {
        // Update existing bank account
        const { error } = await supabase
          .from('user_bank_accounts')
          .update({
            bank_name: saveData.bankName,
            account_title: saveData.accountTitle,
            account_iban: saveData.accountIban,
            is_active: saveData.isActive,
          })
          .eq('id', saveData.bankAccountId);

        if (error) {
          console.error('Error updating bank account:', error);
          Alert.alert('Error', 'Failed to update bank account');
          return;
        }
      } else {
        // Create new bank account
        const { error } = await supabase
          .from('user_bank_accounts')
          .insert({
            user_id: authUser.id,
            bank_name: saveData.bankName,
            account_title: saveData.accountTitle,
            account_iban: saveData.accountIban,
            is_active: saveData.isActive,
          });

        if (error) {
          console.error('Error creating bank account:', error);
          Alert.alert('Error', 'Failed to create bank account');
          return;
        }
      }

      Alert.alert(
        'Success',
        saveData.isEditing ? 'Bank account updated successfully' : 'Bank account added successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

      // Clear pending save data
      setPendingSaveData(null);
    } catch (error) {
      console.error('Error saving bank account:', error);
      Alert.alert('Error', 'Failed to save bank account');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASuccess = async () => {
    setShow2FAModal(false);
    await performSave();
  };

  const handle2FACancel = () => {
    setShow2FAModal(false);
    setPendingSaveData(null);
  };

  const selectBank = (bank: PakistaniBank) => {
    setBankName(bank.bank_name);
    setShowBankDropdown(false);
    setSearchQuery('');
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

  const renderBankItem = ({ item }: { item: PakistaniBank }) => (
    <TouchableOpacity
      style={styles.bankItem}
      onPress={() => selectBank(item)}
    >
      <View style={styles.bankItemContent}>
        <View style={styles.bankItemIcon}>
          <Ionicons
            name={getBankIcon(item.bank_name) as any}
            size={20}
            color="#09d2fe"
          />
        </View>
        <View style={styles.bankItemInfo}>
          <Text style={styles.bankItemName}>{item.bank_name}</Text>
          <Text style={styles.bankItemType}>
            {item.type === 'bank' ? 'Traditional Bank' : 'Digital Wallet'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bank Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bank/Digital Wallet *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowBankDropdown(true)}
          >
            <Text style={[styles.dropdownText, !bankName && styles.placeholderText]}>
              {bankName || 'Select bank or digital wallet'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Account Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account Title *</Text>
          <TextInput
            style={styles.textInput}
            value={accountTitle}
            onChangeText={setAccountTitle}
            placeholder="Enter account holder name"
            placeholderTextColor="#666"
            autoCapitalize="words"
          />
        </View>

        {/* Account/IBAN */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account/IBAN Number *</Text>
          <TextInput
            style={styles.textInput}
            value={accountIban}
            onChangeText={setAccountIban}
            placeholder="Enter account or IBAN number"
            placeholderTextColor="#666"
            autoCapitalize="characters"
          />
        </View>

        {/* Active Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Status</Text>
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setIsActive(!isActive)}
          >
            <Text style={styles.toggleLabel}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
            <View style={[styles.toggleSwitch, isActive && styles.toggleSwitchActive]}>
              <View style={[styles.toggleThumb, isActive && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.saveButtonText}>Saving...</Text>
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Bank Account' : 'Add Bank Account'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Bank Selection Modal */}
      <Modal
        visible={showBankDropdown}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowBankDropdown(false);
                setSearchQuery('');
              }}
            >
              <Ionicons name="close" size={24} color="#09d2fe" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Bank</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search banks..."
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <FlatList
            data={filteredBanks}
            renderItem={renderBankItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.bankList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* 2FA Verification Modal */}
      <OTPVerification
        visible={show2FAModal}
        onClose={handle2FACancel}
        onSuccess={handle2FASuccess}
        action={isEditing ? "edit_bank" : "add_bank"}
        title={isEditing ? "Update Bank Account" : "Add Bank Account"}
        description="Please verify your identity with 2FA to continue"
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
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
  dropdownText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  placeholderText: {
    color: '#666',
  },
  textInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  toggleContainer: {
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
  toggleLabel: {
    fontSize: 16,
    color: '#fff',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#09d2fe',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  saveButton: {
    backgroundColor: '#09d2fe',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
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
  searchContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#fff',
  },
  bankList: {
    flex: 1,
  },
  bankItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  bankItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankItemInfo: {
    flex: 1,
  },
  bankItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  bankItemType: {
    fontSize: 12,
    color: '#666',
  },
}); 