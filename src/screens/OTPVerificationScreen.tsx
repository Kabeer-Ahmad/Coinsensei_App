import React from 'react';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OTPVerification from './OTPVerification';
import { RootStackParamList } from '../types';

type OTPVerificationRouteProp = RouteProp<RootStackParamList, 'OTPVerification'>;
type OTPVerificationNavigationProp = StackNavigationProp<RootStackParamList, 'OTPVerification'>;

const OTPVerificationScreen: React.FC = () => {
  const route = useRoute<OTPVerificationRouteProp>();
  const navigation = useNavigation<OTPVerificationNavigationProp>();
  
  const { action, onSuccess } = route.params;

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSuccess = () => {
    console.log('OTPVerificationScreen: handleSuccess called');
    // First navigate back to close OTP screen
    navigation.goBack();
    // Then execute the success callback with a small delay to ensure navigation completes
    setTimeout(() => {
      console.log('OTPVerificationScreen: Executing onSuccess callback');
      onSuccess();
    }, 100);
  };

  const getTitle = () => {
    switch (action) {
      case 'login':
        return 'Complete Login';
      case 'add_bank':
        return 'Add Bank Account';
      case 'delete_bank':
        return 'Delete Bank Account';
      case 'change_password':
        return 'Change Password';
      case 'enable_2fa':
        return 'Enable 2FA';
      default:
        return 'Verify Identity';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'login':
        return 'Please verify your identity with 2FA to continue';
      case 'add_bank':
        return 'Please verify your identity before adding a bank account';
      case 'delete_bank':
        return 'Please verify your identity before deleting a bank account';
      case 'change_password':
        return 'Please verify your identity before changing your password';
      case 'enable_2fa':
        return 'Please verify your identity to enable 2FA';
      default:
        return 'Please verify your identity to continue';
    }
  };

  return (
    <OTPVerification
      visible={true}
      onClose={handleClose}
      onSuccess={handleSuccess}
      action={action}
      title={getTitle()}
      description={getDescription()}
    />
  );
};

export default OTPVerificationScreen;