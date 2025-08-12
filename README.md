# 🪙 Coinsensei - Pakistan's Most Trusted P2P Crypto Trading Platform

A modern React Native app built with Expo and Supabase, featuring stunning jet black background, vibrant blue gradients, clean spacing, and robust authentication for P2P crypto trading.

## ✨ Features

- 🔐 **Secure Authentication** - Supabase-powered signup/login with email verification
- 🎨 **Jet Black Design** - Pure black (#000000) background with bright blue (#60a5fa) gradients and clean spacing
- 📱 **Cross-Platform** - Works on both iOS and Android
- 🌟 **Professional Branding** - Coinsensei logo integration throughout the app
- 💫 **Smooth Animations** - Fade-in, slide-up, spring animations with shimmer effects
- 🚀 **Quick Action Buttons** - Prominently placed signup/login buttons in the landing area
- 🔧 **Type-Safe** - Built with TypeScript for better development experience
- 📊 **User Profiles** - Complete user management with KYC status tracking
- 🛡️ **Error Handling** - Comprehensive error handling with user-friendly messages

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- A Supabase account (free tier available)

### 1. Supabase Setup

#### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Name it "Coinsensei" and choose your region
3. Save your database password securely

#### Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **Anon public key**
3. Update `src/config/supabase.ts` with your credentials:

```typescript
const supabaseUrl = 'YOUR_PROJECT_URL'
const supabaseAnonKey = 'YOUR_ANON_KEY'
```

#### Set Up the Database

Run this SQL in your Supabase SQL Editor to fix RLS policy issues:

```sql
-- Create the user_profile table
CREATE TABLE public.user_profile (
  uid uuid NOT NULL,
  full_name text NOT NULL DEFAULT ''::text,
  username text NULL,
  phone_number text NULL,
  avatar_url text NULL,
  role text NOT NULL DEFAULT 'user'::text,
  cnic_number text NULL,
  dob date NULL,
  address text NULL,
  kyc_status text NOT NULL DEFAULT 'not_submitted'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  is_locked boolean NULL DEFAULT false,
  CONSTRAINT user_profile_pkey PRIMARY KEY (uid),
  CONSTRAINT user_profile_uid_fkey FOREIGN KEY (uid) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create a function to handle profile creation with elevated privileges
CREATE OR REPLACE FUNCTION create_user_profile(user_id uuid, user_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profile (uid, full_name, created_at)
  VALUES (user_id, user_full_name, now())
  ON CONFLICT (uid) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text) TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own profile" ON public.user_profile
  FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE USING (auth.uid() = uid);

CREATE POLICY "Allow profile creation" ON public.user_profile
  FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.user_profile TO authenticated;
GRANT ALL ON public.user_profile TO service_role;
```

#### Configure Authentication

1. Go to **Authentication** → **Settings**
2. Add your development URL to **Site URL**: `exp://localhost:19000`
3. Configure email templates if desired

### 2. Run the App

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Or run on specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
```

### 3. Test on Your Device

1. Install **Expo Go** from App Store/Play Store
2. Scan the QR code displayed in your terminal
3. Your Coinsensei app will load with all features!

## 📱 App Screens

### 🏠 Landing Screen
- Animated Coinsensei logo on jet black background
- Quick action buttons: "Get Started Free" and "I Have Account"
- Bright blue gradient headings with no glow effects
- Call-to-action buttons with vibrant blue colors

### 🔐 Authentication Screens
- **Sign Up**: Email verification with profile creation on pure black background
- **Login**: Secure authentication with bright blue headings
- Enhanced form validation and error handling
- Loading states with spinners and disabled states
- Compact spacing for better UX

### 🏡 Home Dashboard
- Welcome message with user info on jet black background
- Feature preview for upcoming trading functionality
- Clean navigation and user account management

## 🛠️ Technical Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo SDK 53** - Latest development framework
- **TypeScript** - Type-safe development
- **React Navigation 7** - Modern navigation system

### Backend & Database
- **Supabase** - Authentication and database
- **PostgreSQL** - Robust relational database
- **Database Functions** - Secure profile creation with elevated privileges
- **Row Level Security** - Data protection with improved policies

### UI & Animation
- **React Native Animated API** - Smooth animations with shimmer effects
- **Custom Components** - Reusable UI elements
- **Jet Black Theme** - Pure black (#000000) background with bright blue (#60a5fa) gradients
- **Clean Spacing** - Optimized padding and margins for better UX

## 📂 Project Structure

```
src/
├── config/
│   └── supabase.ts          # Database configuration
├── context/
│   └── AuthContext.tsx      # Authentication with database function
├── navigation/
│   └── AppNavigator.tsx     # App navigation setup
├── screens/
│   ├── LandingScreen.tsx    # Landing page with quick actions & jet black theme
│   ├── LoginScreen.tsx      # User login with bright blue gradients
│   ├── SignUpScreen.tsx     # User registration with bright blue gradients
│   └── HomeScreen.tsx       # Post-auth dashboard
├── types/
│   └── index.ts             # TypeScript definitions
assets/
├── logo.webp                # Main app logo
├── android-chrome-*.png     # Android icons
├── apple-touch-icon.png     # iOS icon
└── favicon-*.png            # Web favicons
```

## 🔧 Configuration

### Environment Variables
Update `src/config/supabase.ts` with your credentials:
- `supabaseUrl`: Your Supabase project URL
- `supabaseAnonKey`: Your Supabase anonymous key

### App Configuration
The `app.json` file contains:
- App name and branding
- Jet black theme icon and splash screen configuration
- Platform-specific settings

## 🌟 Key Features Explained

### Authentication Flow
1. **Landing Screen** - Welcome with quick action buttons and jet black background
2. **Registration** - Email/password signup with validation
3. **Email Verification** - Supabase handles email confirmation
4. **Profile Creation** - Secure database function bypasses RLS issues
5. **Login** - Secure authentication with session management

### UI/UX Features
- **Jet Black Background** - Pure black (#000000) throughout the app
- **Bright Blue Gradients** - Vibrant blue colors (#60a5fa) without glow effects
- **Quick Action Buttons** - Prominently placed in the landing area for better UX
- **Clean Spacing** - Optimized padding and margins for better readability
- **Responsive Layout** - Works on all screen sizes
- **Error Handling** - User-friendly error messages
- **Loading States** - Visual feedback during operations

### Database Schema
- **Users Table** - Managed by Supabase Auth
- **User Profiles** - Extended user information
- **KYC Status** - Verification tracking
- **Database Functions** - Secure profile creation with elevated privileges

## 🚀 Future Enhancements

### Trading Features (Coming Soon)
- 💰 Buy/Sell USDT with PKR
- 🏦 Multiple payment methods (JazzCash, EasyPaisa, Bank Transfer)
- 🔒 Escrow protection for trades
- 📊 Real-time trading interface
- 💳 TRC20 wallet integration

### User Experience
- 🔔 Push notifications
- 📱 Biometric authentication
- 🌍 Multi-language support
- 📈 Trading history and analytics

## 🆘 Troubleshooting

### Common Issues

**Profile Creation Error (RLS Policy) - FIXED!**
- The app now uses a secure database function (`create_user_profile`) 
- This bypasses RLS policy issues during signup
- If still experiencing issues, make sure you've run the complete SQL setup

**Network Request Failed**
- Ensure your internet connection is stable
- Verify Supabase credentials are correct
- Check if Supabase project is active

**App Won't Start**
- Run `npm install` to ensure dependencies are installed
- Clear Expo cache: `npx expo start --clear`
- Restart your development server

**Authentication Issues**
- Verify email templates are configured in Supabase
- Check that the database function `create_user_profile` exists
- Ensure user profile table exists with proper policies

## 📄 License

This project is for educational and development purposes.

## 🤝 Support

For questions or issues:
1. Check [Supabase Documentation](https://docs.supabase.com)
2. Visit [Expo Documentation](https://docs.expo.dev)
3. Review [React Navigation Docs](https://reactnavigation.org)

---

**Made with ❤️ for Pakistan's crypto trading community** 🇵🇰 