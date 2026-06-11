import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

export default function Login() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const login = async () => {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Login failed', error.message)
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logo}>SparkCall</Text>
          <Text style={s.tagline}>Premium 1-on-1 Connections</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={C.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={C.muted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={login}
            disabled={loading}
          >
            <Text style={s.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={s.link}>
              New to SparkCall? <Text style={{ color: C.rose }}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  inner:     { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoWrap:  { alignItems: 'center', marginBottom: 48 },
  logo:      { fontSize: 38, color: C.white, fontFamily: 'Outfit_700Bold', letterSpacing: 1 },
  tagline:   { fontSize: 13, color: C.muted, marginTop: 4, fontFamily: 'Outfit_400Regular' },
  form:      { gap: 10 },
  label:     { fontSize: 12, color: C.muted, fontFamily: 'Outfit_500Medium',
               letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  input:     {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, color: C.white,
    fontFamily: 'Outfit_400Regular', fontSize: 15, marginBottom: 8,
  },
  btn:       {
    backgroundColor: C.rose, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:   { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' },
  link:      { color: C.muted, textAlign: 'center', marginTop: 20,
               fontFamily: 'Outfit_400Regular', fontSize: 14 },
})
