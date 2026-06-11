import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { openBrowserAsync } from 'expo-web-browser'
import { C } from '../../lib/theme'

const API = 'https://sparkcall.vercel.app'

const PLANS = [
  { id:'gold', label:'Gold', price:'$9.99/mo', discount:'10% off calls',
    perks:['10% off all calls','Priority matching','Gold badge'] },
  { id:'platinum', label:'Platinum', price:'$19.99/mo', discount:'20% off calls',
    perks:['20% off all calls','Priority matching','Platinum badge','Exclusive hosts'] },
]

export default function Premium() {
  const [loading, setLoading] = useState(false)

  const subscribe = async (planId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/payments/create-subscription`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ planId }),
      })
      const { url } = await res.json()
      if (url) await openBrowserAsync(url)
    } catch(e) { Alert.alert('Error', 'Could not start checkout') }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.root}>
      <Text style={s.title}>Go Premium ✦</Text>
      <Text style={s.sub}>Save on every call. Stand out.</Text>
      <View style={s.plans}>
        {PLANS.map(plan => (
          <View key={plan.id} style={[s.card, plan.id === 'platinum' && s.cardPlatinum]}>
            <Text style={[s.planLabel, plan.id === 'platinum' && { color:C.platinum }]}>
              {plan.label}
            </Text>
            <Text style={s.price}>{plan.price}</Text>
            <Text style={s.discount}>{plan.discount}</Text>
            <View style={s.perks}>
              {plan.perks.map(p => (
                <Text key={p} style={s.perk}>✓ {p}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={[s.btn, plan.id === 'platinum' && s.btnPlatinum]}
              onPress={() => subscribe(plan.id)} disabled={loading}>
              <Text style={s.btnTxt}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:          { flex:1, backgroundColor:C.bg, padding:20 },
  title:         { fontSize:28, color:C.white, fontFamily:'Outfit_700Bold', marginTop:20 },
  sub:           { fontSize:14, color:C.muted, fontFamily:'Outfit_400Regular', marginTop:4, marginBottom:28 },
  plans:         { gap:16 },
  card:          { backgroundColor:C.card, borderWidth:1, borderColor:C.border,
                   borderRadius:18, padding:22, gap:6 },
  cardPlatinum:  { borderColor:C.platinum, backgroundColor:'rgba(184,204,228,0.06)' },
  planLabel:     { fontSize:22, color:C.gold, fontFamily:'Outfit_700Bold' },
  price:         { fontSize:26, color:C.white, fontFamily:'Outfit_700Bold' },
  discount:      { fontSize:13, color:C.muted, fontFamily:'Outfit_400Regular' },
  perks:         { gap:4, marginTop:8, marginBottom:4 },
  perk:          { fontSize:13, color:C.white, fontFamily:'Outfit_400Regular' },
  btn:           { backgroundColor:C.rose, borderRadius:12, padding:14, alignItems:'center', marginTop:8 },
  btnPlatinum:   { backgroundColor:C.platinum },
  btnTxt:        { color:'#fff', fontSize:15, fontFamily:'Outfit_700Bold' },
})
