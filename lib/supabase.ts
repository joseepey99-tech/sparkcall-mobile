import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://buvkyfqwxkljbuuakfee.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dmt5ZnF3eGtsamJ1dWFrZmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzIwNTMsImV4cCI6MjA5NTU0ODA1M30.rK7OXSRESMTaGAL17f4ePlLuttqVqq81OwrklqAHVJY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
