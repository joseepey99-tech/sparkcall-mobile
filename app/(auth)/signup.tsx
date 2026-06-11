import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

const INTERESTS = ['Music','Travel','Fitness','Gaming','Cooking','Fashion','Art','Business','Tech','Sports']
const REGIONS   = ['Africa','Asia','Europe','Americas','Middle East','Oceania']

export default function Signup() {
  const router  = useRouter()
  const [step, setStep]             = useState(1)
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [gender, setGender]         = useState('')
  const [dob, setDob]               = useState('')
  const [region, setRegion]         = useState('')
  const [interests, setInterests]   = useState<string[]>([])
  const [role, setRole]             = useState('')
  const [loading, setLoading]       = useState(false)

  const toggleInterest = (i: string) =>
    setInterests(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])

  const next = () => {
    if (step === 1 && (!name || !email || !password || !gender || !dob || !region)) {
      Alert.alert('Fill all fields'); return
    }
    if (step === 2 && interests.length === 0) {
      Alert.alert('Select at least one interest'); return
    }
    if (step === 3) { signup(); return }
    setStep(s => s + 1)
    if (step === 1) setRole(gender === 'female' ? 'host' : 'caller')
  }

  const signup = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { Alert.alert('Error', error.message); setLoading(false); return }
    await supabase.from('profiles').upsert({
      id: data.user!.id,
      name, email, gender, dob, region,
      interests, role, credits: 100,
      rate: role === 'host' ? 10 : null,
    })
    setLoading(false)
    Alert.alert('Welcome!', 'Check your email to confirm your account.')
    router.replace('/(auth)/login')
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Text style={s.title}>SparkCall</Text>
        <View style={s.steps}>
          {[1,2,3].map(n => (
            <View key={n} style={[s.dot, step >= n && s.dotActive]}/>
          ))}
        </View>
        <Text style={s.subtitle}>
          {step === 1 ? 'Create your account' : step === 2 ? 'Your interests' : 'Your role'}
        </Text>

        {/* Step 1 — Info */}
        {step === 1 && (
          <View style={s.form}>
            {[
              { label: 'Full Name', value: name, set: setName, placeholder: 'Sofia Laurent' },
              { label: 'Email',     value: email, set: setEmail, placeholder: 'you@example.com', type: 'email-address' as const },
              { label: 'Password',  value: password, set: setPassword, placeholder: '••••••••', secure: true },
              { label: 'Date of Birth', value: dob, set: setDob, placeholder: 'DD/MM/YYYY' },
            ].map(f => (
              <View key={f.label}>
                <Text style={s.label}>{f.label}</Text>
                <TextInput
                  style={s.input} value={f.value} onChangeText={f.set}
                  placeholder={f.placeholder} placeholderTextColor={C.muted}
                  secureTextEntry={f.secure} keyboardType={f.type}
                  autoCapitalize={f.secure || f.type ? 'none' : 'words'}
                  autoCorrect={false}
                />
              </View>
            ))}

            <Text style={s.label}>Gender</Text>
            <View style={s.row}>
              {['male','female','other'].map(g => (
                <Pressable key={g} onPress={() => setGender(g)}
                  style={[s.chip, gender === g && s.chipActive]}>
                  <Text style={[s.chipTxt, gender === g && s.chipTxtActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>Region</Text>
            <View style={s.row}>
              {REGIONS.map(r => (
                <Pressable key={r} onPress={() => setRegion(r)}
                  style={[s.chip, region === r && s.chipActive]}>
                  <Text style={[s.chipTxt, region === r && s.chipTxtActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 2 — Interests */}
        {step === 2 && (
          <View style={s.form}>
            <View style={s.row}>
              {INTERESTS.map(i => (
                <Pressable key={i} onPress={() => toggleInterest(i)}
                  style={[s.chip, interests.includes(i) && s.chipActive]}>
                  <Text style={[s.chipTxt, interests.includes(i) && s.chipTxtActive]}>{i}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 3 — Role */}
        {step === 3 && (
          <View style={s.form}>
            <Text style={s.hint}>
              Based on your gender we pre-selected a role. You can change this anytime.
            </Text>
            {[
              { r: 'host',   label: 'Host',   desc: 'Earn Sparks by taking calls. Set your own rate.' },
              { r: 'caller', label: 'Caller', desc: 'Connect with amazing hosts. Pay per minute.' },
            ].map(({ r, label, desc }) => (
              <Pressable key={r} onPress={() => setRole(r)}
                style={[s.roleCard, role === r && s.roleCardActive]}>
                <Text style={[s.roleLabel, role === r && { color: C.rose }]}>{label}</Text>
                <Text style={s.roleDesc}>{desc}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={next} disabled={loading}
        >
          <Text style={s.btnText}>
            {loading ? 'Creating account…' : step === 3 ? 'Create Account' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.link}>Already have an account? <Text style={{ color: C.rose }}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  inner:          { flexGrow: 1, padding: 28, paddingTop: 60 },
  title:          { fontSize: 32, color: C.white, fontFamily: 'Outfit_700Bold', textAlign: 'center' },
  steps:          { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive:      { backgroundColor: C.rose },
  subtitle:       { fontSize: 18, color: C.white, fontFamily: 'Outfit_500Medium',
                    textAlign: 'center', marginBottom: 28 },
  form:           { gap: 12, marginBottom: 24 },
  label:          { fontSize: 11, color: C.muted, fontFamily: 'Outfit_500Medium',
                    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  input:          {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, color: C.white,
    fontFamily: 'Outfit_400Regular', fontSize: 15,
  },
  row:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card,
  },
  chipActive:     { backgroundColor: 'rgba(214,63,110,0.15)', borderColor: C.rose },
  chipTxt:        { color: C.muted, fontFamily: 'Outfit_400Regular', fontSize: 13 },
  chipTxtActive:  { color: C.rose },
  hint:           { color: C.muted, fontSize: 13, fontFamily: 'Outfit_400Regular',
                    lineHeight: 20, marginBottom: 8 },
  roleCard:       {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 18, gap: 4,
  },
  roleCardActive: { borderColor: C.rose, backgroundColor: 'rgba(214,63,110,0.08)' },
  roleLabel:      { fontSize: 17, color: C.white, fontFamily: 'Outfit_700Bold' },
  roleDesc:       { fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular' },
  btn:            {
    backgroundColor: C.rose, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 16,
  },
  btnDisabled:    { opacity: 0.6 },
  btnText:        { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' },
  link:           { color: C.muted, textAlign: 'center',
                    fontFamily: 'Outfit_400Regular', fontSize: 14 },
})
