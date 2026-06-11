import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://buvkyfqwxkljbuuakfee.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_HrcOXo-sZEdkJiyJgWRk0A_Hjhm-gEo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
