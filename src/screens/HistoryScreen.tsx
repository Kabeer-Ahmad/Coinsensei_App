import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  FlatList,
  RefreshControl,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../config/supabase';
import { PKRDeposit, PKRWithdrawal, RootStackParamList } from '../types';
import { useRefreshControl } from '../hooks/useRefreshControl';

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'History'>;

interface HistoryItem {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: string;
  date: string;
  reference?: string;
  bankName?: string;
  bankAccountTitle?: string;
  bankAccountIban?: string;
  screenshotUrl?: string;
  adminNotes?: string;
  processedAt?: string;
}

export default function HistoryScreen() {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'pkr' | 'usdt'>('pkr');
  const [pkrHistory, setPkrHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { isRefreshing, handleRefresh } = useRefreshControl();



  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animations
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

    fetchPkrHistory();
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'pkr') {
        fetchPkrHistory();
      }
    }, [activeTab])
  );

  useEffect(() => {
    // Tab indicator animation
    Animated.timing(tabIndicatorAnim, {
      toValue: activeTab === 'pkr' ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  const fetchPkrHistory = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch PKR deposits
      const { data: deposits, error: depositsError } = await supabase
        .from('pkr_deposits')
        .select(`
          id,
          amount,
          status,
          created_at,
          screenshot_url,
          bank_accounts (
            bank_name,
            account_title,
            account_iban
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (depositsError) {
        console.error('Error fetching deposits:', depositsError);
      }

      // Fetch PKR withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('pkr_withdrawals')
        .select(`
          id,
          amount,
          status,
          created_at,
          user_bank_accounts (
            bank_name,
            account_title,
            account_iban
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
      }

      // Combine and format history items
      const historyItems: HistoryItem[] = [];

      // Add deposits
      if (deposits) {
        deposits.forEach(deposit => {
          historyItems.push({
            id: `deposit-${deposit.id}`,
            type: 'deposit',
            amount: deposit.amount,
            status: deposit.status,
            date: deposit.created_at,
            bankName: deposit.bank_accounts?.bank_name,
            bankAccountTitle: deposit.bank_accounts?.account_title,
            bankAccountIban: deposit.bank_accounts?.account_iban,
            screenshotUrl: deposit.screenshot_url,
          });
        });
      }

      // Add withdrawals
      if (withdrawals) {
        withdrawals.forEach(withdrawal => {
          historyItems.push({
            id: `withdrawal-${withdrawal.id}`,
            type: 'withdrawal',
            amount: withdrawal.amount,
            status: withdrawal.status,
            date: withdrawal.created_at,
            bankName: withdrawal.user_bank_accounts?.bank_name,
            bankAccountTitle: withdrawal.user_bank_accounts?.account_title,
            bankAccountIban: withdrawal.user_bank_accounts?.account_iban,
          });
        });
      }

      // Sort by date (newest first)
      historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log('Final history items:', historyItems);
      setPkrHistory(historyItems);
    } catch (error) {
      console.error('Error fetching PKR history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await handleRefresh(fetchPkrHistory);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const openTransactionDetails = async (item: HistoryItem) => {
    console.log('Opening transaction details:', item);
    setSelectedItem(item);
    setShowModal(true);
    setImageError(false); // Reset image error state
    setImageUrl(null); // Reset image URL
    
    // Animate modal entrance
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // If it's a deposit with screenshot, try to get a signed URL
    if (item.type === 'deposit' && item.screenshotUrl) {
      try {
        // Extract the file path from the URL
        const urlParts = item.screenshotUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const userId = urlParts[urlParts.length - 2];
        const filePath = `${userId}/${fileName}`;
        
        console.log('Attempting to get signed URL for:', filePath);
        
        // Get a signed URL that expires in 1 hour
        const { data, error } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(filePath, 3600);
        
        if (error) {
          console.log('Error getting signed URL:', error);
          setImageUrl(item.screenshotUrl); // Fallback to original URL
        } else {
          console.log('Signed URL generated:', data.signedUrl);
          setImageUrl(data.signedUrl);
        }
      } catch (error) {
        console.log('Error in signed URL generation:', error);
        setImageUrl(item.screenshotUrl); // Fallback to original URL
      }
    }
  };

  const closeTransactionDetails = () => {
    // Animate modal exit
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(modalScaleAnim, {
        toValue: 0.8,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(false);
      setSelectedItem(null);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'declined':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'declined':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItemContainer}
      onPress={() => openTransactionDetails(item)}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.historyItem,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
      <View style={styles.historyItemHeader}>
        <View style={styles.historyItemLeft}>
          <View style={[
            styles.typeIcon,
            { backgroundColor: item.type === 'deposit' ? '#10b981' : '#ef4444' }
          ]}>
            <Ionicons
              name={item.type === 'deposit' ? 'arrow-down' : 'arrow-up'}
              size={16}
              color="#ffffff"
            />
          </View>
          <View style={styles.historyItemInfo}>
            <Text style={styles.historyItemTitle}>
              {item.type === 'deposit' ? 'PKR Deposit' : 'PKR Withdrawal'}
            </Text>
            <Text style={styles.historyItemDate}>{formatDate(item.date)}</Text>
            {item.bankName && (
              <Text style={styles.historyItemBank}>{item.bankName}</Text>
            )}
          </View>
        </View>
        <View style={styles.historyItemRight}>
          <Text style={styles.historyItemAmount}>₨{item.amount}</Text>
          <View style={styles.statusContainer}>
            <Ionicons
              name={getStatusIcon(item.status) as any}
              size={14}
              color={getStatusColor(item.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
              </View>
      </Animated.View>
    </TouchableOpacity>
  );

  const renderComingSoon = () => (
    <Animated.View
      style={[
        styles.comingSoonContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name="time-outline" size={64} color="#6b7280" />
      <Text style={styles.comingSoonTitle}>Coming Soon</Text>
      <Text style={styles.comingSoonText}>
        USDT transaction history will be available soon.
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#09d2fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('pkr')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'pkr' && styles.activeTabText
          ]}>
            PKR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('usdt')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'usdt' && styles.activeTabText
          ]}>
            USDT
          </Text>
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{
                translateX: tabIndicatorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 150], // Adjust based on tab width
                }),
              }],
            },
          ]}
        />
      </View>

      {/* Content */}
      {activeTab === 'pkr' ? (
        <FlatList
          data={pkrHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          style={styles.historyList}
          contentContainerStyle={styles.historyListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#09d2fe"
              colors={["#09d2fe"]}
            />
          }
          ListEmptyComponent={
            <Animated.View
              style={[
                styles.emptyContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Ionicons name="receipt-outline" size={64} color="#6b7280" />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyText}>
                Your PKR deposit and withdrawal history will appear here.
              </Text>
            </Animated.View>
          }
        />
      ) : (
        <ScrollView
          style={styles.comingSoonScroll}
          contentContainerStyle={styles.comingSoonScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#09d2fe"
              colors={["#09d2fe"]}
            />
          }
        >
          {renderComingSoon()}
        </ScrollView>
      )}

      {/* Transaction Details Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTransactionDetails}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                opacity: modalAnim,
                transform: [{ scale: modalScaleAnim }],
              }
            ]}
          >
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={[
                      styles.modalTypeIcon,
                      { backgroundColor: selectedItem.type === 'deposit' ? '#10b981' : '#ef4444' }
                    ]}>
                      <Ionicons
                        name={selectedItem.type === 'deposit' ? 'arrow-down' : 'arrow-up'}
                        size={20}
                        color="#ffffff"
                      />
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>
                        {selectedItem.type === 'deposit' ? 'PKR Deposit' : 'PKR Withdrawal'}
                      </Text>
                      <Text style={styles.modalAmount}>₨{selectedItem.amount}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeTransactionDetails}
                  >
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalBodyContent}
                >
                  {/* Status Tag */}
                  <View style={styles.statusTagContainer}>
                    <View style={[styles.statusTag, { backgroundColor: getStatusColor(selectedItem.status) + '20' }]}>
                      <Ionicons 
                        name={getStatusIcon(selectedItem.status) as any} 
                        size={14} 
                        color={getStatusColor(selectedItem.status)} 
                      />
                      <Text style={[styles.statusTagText, { color: getStatusColor(selectedItem.status) }]}>
                        {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Date & Time Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Date & Time</Text>
                    <Text style={styles.modalDetailText}>{formatDate(selectedItem.date)}</Text>
                  </View>

                  {/* Bank Details Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Bank Details</Text>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankDetailLabel}>Bank:</Text>
                      <Text style={styles.bankDetailValue}>{selectedItem.bankName || 'N/A'}</Text>
                    </View>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankDetailLabel}>Account Title:</Text>
                      <Text style={styles.bankDetailValue}>{selectedItem.bankAccountTitle || 'N/A'}</Text>
                    </View>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankDetailLabel}>IBAN:</Text>
                      <Text style={styles.bankDetailValue}>{selectedItem.bankAccountIban || 'N/A'}</Text>
                    </View>
                  </View>
                  
                  {selectedItem.type === 'deposit' && selectedItem.screenshotUrl && (
                    <View style={styles.screenshotContainer}>
                      <Text style={styles.modalSectionTitle}>Payment Screenshot</Text>

                      {imageUrl && !imageError ? (
                        <Image
                          source={{ 
                            uri: imageUrl,
                            cache: 'reload',
                            headers: {
                              'Accept': 'image/*',
                              'Cache-Control': 'no-cache'
                            }
                          }}
                          style={styles.screenshotImage}
                          resizeMode="contain"
                          onError={(error) => {
                            console.log('Image loading error:', error);
                            console.log('Failed URL:', imageUrl);
                            setImageError(true);
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully');
                          }}
                        />
                      ) : (
                        <View style={styles.screenshotErrorContainer}>
                          <Ionicons name="image-outline" size={48} color="#6b7280" />
                          <Text style={styles.screenshotErrorText}>Screenshot not available</Text>
                          <Text style={styles.screenshotErrorSubtext}>The image may have been deleted or is inaccessible</Text>
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

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
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    height: 40,
    backgroundColor: '#09d2fe',
    borderRadius: 8,
    zIndex: -1,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyItemContainer: {
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  historyItemBank: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },
  comingSoonScroll: {
    flex: 1,
  },
  comingSoonScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 350,
    maxHeight: '85%',
    minHeight: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#09d2fe',
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    backgroundColor: '#1a1a1a',
    maxHeight: 400,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  modalBodyContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#09d2fe',
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  statusTagContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  bankDetailLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  bankDetailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  statusDetailContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  statusDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDetailText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalDetailText: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#d1d5db',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  screenshotContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  imageLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    width: '100%',
  },
  imageLoadingSpinner: {
    marginBottom: 12,
  },
  imageLoadingText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  screenshotImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  screenshotErrorContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenshotErrorText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  screenshotErrorSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
}); 