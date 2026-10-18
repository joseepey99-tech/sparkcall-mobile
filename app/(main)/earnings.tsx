import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

const METHODS = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'wise', label: 'Wise' },
  { id: 'bank', label: 'Bank' },
  { id: 'mobile_money', label: 'Mobile money' },
  { id: 'other', label: 'Other' },
]

export default function Earnings() {
  const router = useRouter()
  const [bal, setBal] = useState<any>(null)
  const [reqs, setReqs] = useState<any[]>([])
  const [method, setMethod] = useState('paypal')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login' as any); return }
    const { data: me } = await supabase.from('public_profiles').select('is_host').eq('id', user.id).single()
    if (!me?.is_host) { router.replace('/(main)/home' as any); return }
    const { data, error } = await supabase.rpc('host_balance')
    if (error) { setMsg(error.message); return }
    setBal(data)
    const { data: r } = await supabase.from('payout_requests').select('*').order('created_at', { ascending: false }).limit(10)
    setReqs(r || [])
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('request_payout', { p_method: method, p_details: details })
    if (error) {
      Alert.alert('Payout', error.message.includes('below minimum') ? 'Your available balance is below the minimum payout.' : error.message)
    } else {
      setMsg('Payout requested: $' + data.amount_usd + '. We will pay you and mark it as paid.')
      setDetails('')
      await load()
    }
    setBusy(false)
  }

  const canAsk = !!bal && bal.available_usd >= bal.min_payout_usd && details.trim().length >= 3

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><ChevronLeft size={24} color={C.white} /></TouchableOpacity>
        <Text style={s.title}>Earnings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {!!msg && <View style={s.card}><Text style={s.small}>{msg}</Text></View>}
        {bal && (
          <>
            <View style={s.card}>
              <Text style={s.small}>Available to withdraw</Text>
              <Text style={s.big}>${Number(bal.available_usd).toFixed(2)}</Text>
              <Text style={s.small}>Total earned: ${Number(bal.total_usd).toFixed(2)} ({bal.total_sparks} Sparks)</Text>
              <Text style={[s.small, { marginTop: 4 }]}>
                1 Spark earned = ${bal.usd_per_spark}. New earnings become available after {bal.hold_days} days. Minimum payout: ${bal.min_payout_usd}.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.label}>Request a payout</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {METHODS.map(m => (
                  <TouchableOpacity key={m.id} onPress={() => setMethod(m.id)}
                    style={[s.chip, method === m.id && s.chipOn]}>
                    <Text style={{ color: method === m.id ? '#0C0817' : C.white, fontSize: 13 }}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={details} onChangeText={setDetails} multiline maxLength={300}
                placeholder="PayPal email, Wise email, bank IBAN, or mobile money number and provider"
                placeholderTextColor={C.muted} style={s.input} />
              <TouchableOpacity onPress={submit} disabled={!canAsk || busy} style={[s.btn, !canAsk && s.btnOff]}>
                <Text style={{ color: canAsk ? '#0C0817' : C.muted, fontWeight: '600' }}>{busy ? 'Sending...' : 'Request payout'}</Text>
              </TouchableOpacity>
              <Text style={[s.small, { marginTop: 8 }]}>Never share card numbers or passwords.</Text>
            </View>
            {reqs.length > 0 && (
              <View style={s.card}>
                <Text style={s.label}>Your requests</Text>
                {reqs.map(r => (
                  <View key={r.id} style={s.row}>
                    <Text style={s.small}>{new Date(r.created_at).toLocaleDateString()} - {r.method}</Text>
                    <Text style={s.small}>${Number(r.amount_usd).toFixed(2)} - {r.status}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  title: { color: C.white, fontSize: 20, fontWeight: '700' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 14 },
  small: { color: C.muted, fontSize: 12 },
  big: { color: C.gold, fontSize: 34, fontWeight: '700' },
  label: { color: C.white, fontWeight: '600', fontSize: 15 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  input: { color: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 12, minHeight: 70, textAlignVertical: 'top' },
  btn: { backgroundColor: C.gold, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 12 },
  btnOff: { backgroundColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border, marginTop: 6 },
})