import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import AccountSettings from '../screens/AccountSettings';
import KYCSubmission from '../screens/KYCSubmission';
import FacialRecognition from '../screens/FacialRecognition';
import DepositPKRScreen from '../screens/DepositPKRScreen';
import UserBankAccounts from '../screens/UserBankAccounts';
import AddEditBankAccount from '../screens/AddEditBankAccount';
import WithdrawPKR from '../screens/WithdrawPKR';
import HistoryScreen from '../screens/HistoryScreen';
import TwoFactorSetup from '../screens/TwoFactorSetup';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import LoadingScreen from '../screens/LoadingScreen';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();



const AppNavigator: React.FC = () => {
  try {
    const { user, loading } = useAuth();

    if (loading) {
      return <LoadingScreen />;
    }

    return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#000000' },
          }}
          initialRouteName={user ? "Home" : "Landing"}
        >
          {user ? (
            // Authenticated screens
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="AccountSettings" component={AccountSettings} />
              <Stack.Screen name="KYCSubmission" component={KYCSubmission} />
              <Stack.Screen name="FacialRecognition" component={FacialRecognition} />
              <Stack.Screen name="DepositPKR" component={DepositPKRScreen} />
              <Stack.Screen name="UserBankAccounts" component={UserBankAccounts} />
              <Stack.Screen name="AddEditBankAccount" component={AddEditBankAccount} />
              <Stack.Screen name="WithdrawPKR" component={WithdrawPKR} />
              <Stack.Screen name="History" component={HistoryScreen} />
              <Stack.Screen name="TwoFactorSetup" component={TwoFactorSetup} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            </>
          ) : (
            // Unauthenticated screens
            <>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  } catch (error) {
    console.error('AppNavigator error:', error);
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 16 }}>Navigation Error</Text>
      </View>
    );
  }
};



export default AppNavigator; 