// ─── app/(main)/review/[id].tsx ─────────────────────────────────────────────
import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, SafeAreaView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { C } from '../../../lib/theme'

export default function Review() {
  const router = useRouter()
  const { id, duration, cost, isHost, callId } = useLocalSearchParams<{ id:string; duration:string; cost:string; isHost?:string; callId?:string }>()
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (rating === 0) return
    setLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('Could not get current user:', userError?.message)
        setLoading(false)
        return
      }
      const amHost = isHost === 'true'
      const payload = {
        caller_id: amHost ? id : user.id,
        host_id: amHost ? user.id : id,
        call_id: callId || null,
        reviewer_role: amHost ? 'host' : 'caller',
        rating, comment: comment.trim() || null,
        duration_seconds: Number(duration), sparks_spent: Number(cost),
      }
      console.log('Submitting review payload:', JSON.stringify(payload))
      const { data, error } = await supabase.from('reviews').insert(payload).select()
      if (error) {
        console.error('Review insert failed:', JSON.stringify(error))
        setLoading(false)
        return
      }
      console.log('Review insert succeeded:', JSON.stringify(data))
    } catch (e: any) {
      console.error('Unexpected error submitting review:', e?.message || e)
    }
    setLoading(false)
    router.replace('/(main)/home')
  }

  const fmt = (s: number) => `${Math.floor(s/60)}m ${s%60}s`

  return (
    <SafeAreaView style={s.root}>
      <View style={s.inner}>
        <Text style={s.title}>Rate your call ✦</Text>
        <View style={s.summary}>
          <Text style={s.sumItem}>⏱ {fmt(Number(duration))}</Text>
          <Text style={s.sumItem}>⚡ {Number(cost)} spent</Text>
        </View>
        <View style={s.stars}>
          {[1,2,3,4,5].map(n => (
            <TouchableOpacity key={n} onPress={() => setRating(n)}>
              <Text style={[s.star, rating >= n && s.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={s.input}
          value={comment} onChangeText={setComment}
          placeholder="Leave a comment (optional)…"
          placeholderTextColor={C.muted}
          multiline numberOfLines={3}
        />
        <TouchableOpacity
          style={[s.btn, (!rating || loading) && s.btnOff]}
          onPress={submit} disabled={!rating || loading}>
          <Text style={s.btnTxt}>{loading ? 'Submitting…' : 'Submit Review'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(main)/home')}>
          <Text style={s.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:       { flex:1, backgroundColor:C.bg },
  inner:      { flex:1, padding:28, justifyContent:'center', alignItems:'center', gap:20 },
  title:      { fontSize:28, color:C.white, fontFamily:'Outfit_700Bold', textAlign:'center' },
  summary:    { flexDirection:'row', gap:20 },
  sumItem:    { color:C.muted, fontFamily:'Outfit_400Regular', fontSize:14 },
  stars:      { flexDirection:'row', gap:8 },
  star:       { fontSize:44, color:C.border },
  starActive: { color:C.gold },
  input:      { width:'100%', backgroundColor:C.card, borderWidth:1, borderColor:C.border,
                borderRadius:12, padding:14, color:C.white,
                fontFamily:'Outfit_400Regular', fontSize:14, textAlignVertical:'top' },
  btn:        { width:'100%', backgroundColor:C.rose, borderRadius:12,
                padding:16, alignItems:'center' },
  btnOff:     { opacity:0.5 },
  btnTxt:     { color:'#fff', fontFamily:'Outfit_700Bold', fontSize:16 },
  skip:       { color:C.muted, fontFamily:'Outfit_400Regular', fontSize:14 },
})
