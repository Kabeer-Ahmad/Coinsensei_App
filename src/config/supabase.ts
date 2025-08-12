import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// TODO: Replace these with your actual Supabase project credentials
// Get these from: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = 'https://wyqkimrnenizrpnpfqnb.supabase.co' // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5cWtpbXJuZW5penJwbnBmcW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNDAxNTQsImV4cCI6MjA2OTYxNjE1NH0.B_GCmlqa_eIsvZIk0-2b0jSG3baNMlleSiNmMZy2ung' // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) 