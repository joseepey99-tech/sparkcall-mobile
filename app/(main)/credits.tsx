// ─── app/(main)/credits.tsx ─────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { openBrowserAsync } from 'expo-web-browser'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

const PACKS = [
  { id: 'starter',   sparks: 200,  price: '$2.99',  label: 'Starter',    popular: false },
  { id: 'popular',   sparks: 600,  price: '$7.99',  label: 'Popular',    popular: true  },
  { id: 'value',     sparks: 1200, price: '$14.99', label: 'Value',      popular: false },
  { id: 'bestvalue', sparks: 2000, price: '$19.99', label: 'Best Value', popular: false },
]

const API = 'https://sparkcall.vercel.app'

export default function Credits() {
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
      setCredits(data?.credits || 0)
    })
  }, [])

  const buy = async (pack: typeof PACKS[0]) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/payments/create-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      })
      const { url } = await res.json()
      if (url) await openBrowserAsync(url)
    } catch(e) { Alert.alert('Error', 'Could not start checkout') }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.root}>
      <Text style={s.title}>Spark Packs</Text>
      <Text style={s.sub}>Balance: <Text style={{ color: C.gold }}>⚡ {credits.toLocaleString()}</Text></Text>
      <View style={s.grid}>
        {PACKS.map(p => (
          <TouchableOpacity key={p.id} style={[s.card, p.popular && s.cardPopular]}
            onPress={() => buy(p)} disabled={loading}>
            {p.popular && <View style={s.badge}><Text style={s.badgeTxt}>Most Popular</Text></View>}
            <Text style={s.sparks}>⚡ {p.sparks.toLocaleString()}</Text>
            <Text style={s.label}>{p.label}</Text>
            <Text style={s.price}>{p.price}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.note}>Sparks are non-refundable. Used to pay for calls and gifts.</Text>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:        { flex:1, backgroundColor:C.bg, padding:20 },
  title:       { fontSize:28, color:C.white, fontFamily:'Outfit_700Bold', marginTop:20 },
  sub:         { fontSize:14, color:C.muted, fontFamily:'Outfit_400Regular', marginTop:4, marginBottom:24 },
  grid:        { flexDirection:'row', flexWrap:'wrap', gap:12 },
  card:        { width:'47%', backgroundColor:C.card, borderWidth:1, borderColor:C.border,
                 borderRadius:18, padding:18, alignItems:'center', gap:6 },
  cardPopular: { borderColor:C.gold, backgroundColor:'rgba(201,164,106,0.08)' },
  badge:       { backgroundColor:'rgba(201,164,106,0.2)', borderRadius:99, paddingHorizontal:10, paddingVertical:3 },
  badgeTxt:    { color:C.gold, fontSize:10, fontFamily:'Outfit_700Bold' },
  sparks:      { fontSize:22, color:C.gold, fontFamily:'Outfit_700Bold' },
  label:       { fontSize:13, color:C.muted, fontFamily:'Outfit_400Regular' },
  price:       { fontSize:20, color:C.white, fontFamily:'Outfit_700Bold', marginTop:4 },
  note:        { color:C.muted, fontSize:11, textAlign:'center',
                 fontFamily:'Outfit_400Regular', marginTop:24, lineHeight:18 },
})
