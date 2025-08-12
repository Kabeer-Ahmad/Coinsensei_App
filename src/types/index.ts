export interface UserProfile {
  uid: string;
  email?: string;
  full_name: string;
  username?: string;
  phone_number?: string;
  avatar_url?: string;
  role: string;
  cnic_number?: string;
  dob?: string;
  address?: string;
  kyc_status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  two_factor_enabled?: boolean;
  two_factor_secret?: string;
  backup_codes?: string[];
  biometric_enabled?: boolean;
  created_at?: string;
  is_locked?: boolean;
}

export interface KYC {
  id: string;
  uid: string;
  card_front_url?: string;
  card_back_url?: string;
  face_image_url?: string;
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  submitted_at?: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Wallet {
  id: string;
  uid: string;
  pkr_wallet_address: string;
  trc20_wallet_address?: string;
  bep20_wallet_address?: string;
  pkr_balance: number;
  usdt_balance: number;
  pkr_locked: number;
  usdt_locked: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  wallet: Wallet | null;
  loading: boolean;
  pending2FA: { userId: string; show: boolean } | null;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchUserData: (userId: string, showLoading?: boolean) => Promise<void>;
  signInWith2FA: (email: string, password: string) => Promise<any>;
  complete2FALogin: () => Promise<void>;
  cancel2FALogin: () => Promise<void>;
  signInWithBiometric: () => Promise<boolean>;
  enableBiometric: (email: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  prepare2FACompletion?: (email: string, password: string) => void;
  complete2FAUsingExistingSession?: () => Promise<void>;
  beginEmailOtpFlow?: () => void;
  endEmailOtpFlow?: () => void;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_title: string;
  account_iban: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PKRDeposit {
  id: string;
  user_id: string;
  amount: number;
  bank_account_id: string;
  screenshot_url: string | null;
  status: 'pending' | 'completed' | 'declined';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_title: string;
  account_iban: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PKRWithdrawal {
  id: string;
  user_id: string;
  user_bank_account_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'declined';
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PakistaniBank {
  id: number;
  bank_name: string;
  type: 'bank' | 'digital_wallet';
  created_at: string;
}

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  AccountSettings: undefined;
  KYCSubmission: undefined;
  FacialRecognition: undefined;
  DepositPKR: undefined;
  UserBankAccounts: undefined;
  AddEditBankAccount: { bankAccount?: UserBankAccount };
  WithdrawPKR: undefined;
  History: undefined;
  TwoFactorSetup: undefined;
  OTPVerification: { action: 'login' | 'add_bank' | 'delete_bank' | 'enable_2fa' | 'change_password'; onSuccess: () => void };
  ChangePassword: undefined;
}; 