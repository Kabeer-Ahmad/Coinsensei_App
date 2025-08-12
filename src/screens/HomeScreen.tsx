import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  ScrollView,
  Animated,
  Dimensions,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
// import { walletService } from '../services/walletService';
// import { balanceMonitor } from '../services/balanceMonitor';
// import { useRefreshControl } from '../hooks/useRefreshControl';
import { CustomRefreshControl } from '../components/RefreshControl';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  try {
    const { user, wallet, signOut, fetchUserData } = useAuth();
    
    // Use navigation hook with error handling
    let navigation;
    try {
      navigation = useNavigation();
    } catch (error) {
      console.error('Navigation hook error:', error);
      // Return a simple fallback UI if navigation fails
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: 16 }}>Loading...</Text>
        </SafeAreaView>
      );
    }
  
  // Removed TRC20 and BEP20 balance states - will use database values
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start at final value
  const slideAnim = useRef(new Animated.Value(0)).current; // Start at final value
  const balanceAnim = useRef(new Animated.Value(1)).current; // Start at final value
  const statsAnim = useRef(new Animated.Value(1)).current; // Start at final value
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const hasInitialized = useRef(false);

  // Run animations only once on mount
  useEffect(() => {
    if (!hasInitialized.current && user && wallet) {
      hasInitialized.current = true;
      
      // Staggered entrance animations only for first load
      Animated.sequence([
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
        ]),
        Animated.timing(balanceAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(statsAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []); // Empty dependency array - only run once on mount

  // Removed data loading useEffect - no longer needed

  // Removed loadWalletBalances function - using database values instead

  const refreshAllData = async () => {
    try {
      console.log('Starting refresh...');
      
      // Refresh essential data using the existing fetchUserData function
      if (user?.uid) {
        console.log('Refreshing essential data...');
        await fetchUserData(user.uid, false);
      }
      
      console.log('Refresh completed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshAllData();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleAvatarPress = () => {
    navigation.navigate('AccountSettings');
  };



  const getVerificationIcon = () => {
    switch (user?.kyc_status) {
      case 'verified':
        return { name: 'checkmark-circle', color: '#10b981' };
      case 'pending':
        return { name: 'time', color: '#f59e0b' };
      case 'rejected':
        return { name: 'close-circle', color: '#ef4444' };
      default:
        return { name: 'close-circle', color: '#ef4444' };
    }
  };

  const getVerificationText = () => {
    switch (user?.kyc_status) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Not Verified';
    }
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
      Clipboard.setString(text);
      showCustomNotification(`${label} address copied to clipboard`);
    } catch (error) {
      showCustomNotification('Failed to copy address');
    }
  };

  const QuickActionButton: React.FC<{
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    onPress: () => void;
  }> = ({ title, subtitle, icon, color, onPress }) => {
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
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.quickActionCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
            <Ionicons name={icon as any} size={24} color="#ffffff" />
          </View>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

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
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </Text>
            <View style={[styles.verificationBadge, { backgroundColor: getVerificationIcon().color }]}>
              <Ionicons 
                name={getVerificationIcon().name as any} 
                size={12} 
                color="#ffffff" 
              />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
            <Text style={[styles.verificationStatus, { color: getVerificationIcon().color }]}>
              {getVerificationText()}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/android-chrome-192x192.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <CustomRefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
      >

        {/* Top Spacing */}
        <View style={styles.topSpacing} />

        {/* Balance Card */}
        <Animated.View
          style={[
            styles.balanceCard,
            {
              opacity: balanceAnim,
              transform: [
                {
                  scale: balanceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Total Balance</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={isRefreshing}>
              <Animated.View style={[styles.refreshIcon, { transform: [{ rotate: isRefreshing ? '360deg' : '0deg' }] }]}>
                <Ionicons name="refresh" size={20} color="#09d2fe" />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceAmount}>₨{wallet?.pkr_balance || '0.00'}</Text>
              <Text style={styles.balanceLabel}>PKR Balance</Text>
              {wallet?.pkr_locked && wallet.pkr_locked > 0 && (
                <Text style={styles.lockedBalanceText}>₨{wallet.pkr_locked} Locked</Text>
              )}
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceAmount}>${wallet?.usdt_balance?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.balanceLabel}>USDT Balance</Text>
              {wallet?.usdt_locked && wallet.usdt_locked > 0 && (
                <Text style={styles.lockedBalanceText}>${wallet.usdt_locked} Locked</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Wallet Addresses Card */}
        <Animated.View
          style={[
            styles.addressesCard,
            {
              opacity: balanceAnim,
              transform: [
                {
                  scale: balanceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.addressesTitle}>Wallet Addresses</Text>
          
          {wallet?.pkr_wallet_address && (
            <View style={styles.walletAddressContainer}>
              <Text style={styles.walletAddressLabel}>PKR Wallet Address:</Text>
              <TouchableOpacity 
                style={styles.walletAddress}
                onPress={() => copyToClipboard(wallet.pkr_wallet_address!, 'PKR')}
              >
                <Text style={styles.walletAddressText} numberOfLines={1}>
                  {wallet.pkr_wallet_address}
                </Text>
                <Ionicons name="copy-outline" size={16} color="#09d2fe" />
              </TouchableOpacity>
            </View>
          )}
          
          {wallet?.trc20_wallet_address && (
            <View style={styles.walletAddressContainer}>
              <Text style={styles.walletAddressLabel}>TRC20 Address:</Text>
              <TouchableOpacity 
                style={styles.walletAddress}
                onPress={() => copyToClipboard(wallet.trc20_wallet_address!, 'TRC20')}
              >
                <Text style={styles.walletAddressText} numberOfLines={1}>
                  {wallet.trc20_wallet_address}
                </Text>
                <Ionicons name="copy-outline" size={16} color="#09d2fe" />
              </TouchableOpacity>
            </View>
          )}
          
          {wallet?.bep20_wallet_address && (
            <View style={styles.walletAddressContainer}>
              <Text style={styles.walletAddressLabel}>BEP20 Address:</Text>
              <TouchableOpacity 
                style={styles.walletAddress}
                onPress={() => copyToClipboard(wallet.bep20_wallet_address!, 'BEP20')}
              >
                <Text style={styles.walletAddressText} numberOfLines={1}>
                  {wallet.bep20_wallet_address}
                </Text>
                <Ionicons name="copy-outline" size={16} color="#09d2fe" />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>



        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              title="Deposit PKR"
              subtitle="Add PKR to your wallet"
              icon="add-circle"
              color="#10b981"
              onPress={() => navigation.navigate('DepositPKR')}
            />
            <QuickActionButton
              title="Withdraw PKR"
              subtitle="Withdraw to your bank"
              icon="remove-circle"
              color="#ef4444"
              onPress={() => navigation.navigate('WithdrawPKR')}
            />
            <QuickActionButton
              title="Add Bank"
              subtitle="Manage bank accounts"
              icon="card"
              color="#09d2fe"
              onPress={() => navigation.navigate('UserBankAccounts')}
            />
            <QuickActionButton
              title="Convert"
              subtitle="PKR ↔ USDT"
              icon="swap-horizontal"
              color="#3b82f6"
              onPress={() => {}}
            />
            <QuickActionButton
              title="Transfer"
              subtitle="Send USDT to others"
              icon="send"
              color="#8b5cf6"
              onPress={() => {}}
            />
            <QuickActionButton
              title="History"
              subtitle="View all transactions"
              icon="time"
              color="#f59e0b"
              onPress={() => navigation.navigate('History')}
            />
          </View>
        </View>

        {/* Coming Soon Features */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          <View style={styles.comingSoonList}>
            <View style={styles.comingSoonItem}>
              <Ionicons name="shield-checkmark" size={24} color="#09d2fe" />
              <Text style={styles.comingSoonText}>Advanced Security Features</Text>
            </View>
            <View style={styles.comingSoonItem}>
              <Ionicons name="trending-up" size={24} color="#09d2fe" />
              <Text style={styles.comingSoonText}>Real-time Price Charts</Text>
            </View>
            <View style={styles.comingSoonItem}>
              <Ionicons name="people" size={24} color="#09d2fe" />
              <Text style={styles.comingSoonText}>P2P Trading Platform</Text>
            </View>
            <View style={styles.comingSoonItem}>
              <Ionicons name="notifications" size={24} color="#09d2fe" />
              <Text style={styles.comingSoonText}>Price Alerts</Text>
            </View>
            <View style={styles.comingSoonItem}>
              <Ionicons name="card" size={24} color="#09d2fe" />
              <Text style={styles.comingSoonText}>Multiple Payment Methods</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
  } catch (error) {
    console.error('HomeScreen rendering error:', error);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 16 }}>Something went wrong. Please try again.</Text>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  verificationBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  verificationStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topSpacing: {
    height: 16,
  },
  dashboardTagContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dashboardTag: {
    fontSize: 13,
    fontWeight: '500',
    color: '#09d2fe',
    textAlign: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#09d2fe',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  balanceCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  lockedBalanceText: {
    fontSize: 12,
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 2,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    // Animation will be applied here
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333333',
    marginHorizontal: 16,
  },
  addressesCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  addressesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  walletAddressContainer: {
    marginBottom: 12,
  },
  walletAddressLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  walletAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 8,
  },
  walletAddressText: {
    flex: 1,
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#09d2fe',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  comingSoonSection: {
    marginBottom: 32,
  },
  comingSoonList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  comingSoonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
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
});

export default HomeScreen; 