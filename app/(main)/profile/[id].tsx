// ─── app/(main)/profile/[id].tsx ────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { C } from '../../../lib/theme'

export default function Profile() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const router   = useRouter()
  const [host, setHost]       = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: h }, { data: p }, { data: r }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
        supabase.from('reviews').select('*').eq('host_id', id).order('created_at', { ascending: false }).limit(5),
      ])
      setHost(h); setProfile(p); setReviews(r || [])
    }
    load()
  }, [id])

  const getRate = () => {
    if (!profile || !host) return host?.rate || 0
    const d = profile.premium === 'platinum' ? 0.8 : profile.premium === 'gold' ? 0.9 : 1
    return Math.round(host.rate * d)
  }

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  return (
    <SafeAreaView style={s.root}>
      <ScrollView>
        {/* Hero */}
        <View style={s.hero}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{host?.name?.charAt(0)}</Text>
          </View>
          <Text style={s.name}>{host?.name}</Text>
          <Text style={s.region}>{host?.region}</Text>
          <View style={s.stats}>
            <View style={s.stat}><Text style={s.statVal}>⭐ {avgRating}</Text><Text style={s.statLabel}>Rating</Text></View>
            <View style={s.stat}><Text style={s.statVal}>{reviews.length}</Text><Text style={s.statLabel}>Reviews</Text></View>
            <View style={s.stat}><Text style={s.statVal}>⚡ {getRate()}/min</Text><Text style={s.statLabel}>Your rate</Text></View>
          </View>
        </View>

        {/* Bio */}
        {host?.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bio}>{host.bio}</Text>
          </View>
        )}

        {/* Interests */}
        {host?.interests?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Interests</Text>
            <View style={s.chips}>
              {host.interests.map((i: string) => (
                <View key={i} style={s.chip}><Text style={s.chipTxt}>{i}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Reviews</Text>
            {reviews.map(r => (
              <View key={r.id} style={s.reviewCard}>
                <Text style={s.stars}>{'⭐'.repeat(r.rating)}</Text>
                {r.comment && <Text style={s.comment}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={s.cta}>
        <TouchableOpacity
          style={s.chatBtn}
          onPress={() => router.push({ pathname: '/(main)/chat/[id]', params: { id } })}>
          <Text style={s.chatBtnTxt}>💬 Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.callBtn}
          onPress={() => router.push({ pathname: '/(main)/call/[id]', params: { id } })}>
          <Text style={s.callBtnTxt}>📞 Start Call · ⚡{getRate()}/min</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:        { flex:1, backgroundColor:C.bg },
  hero:        { alignItems:'center', padding:24, paddingTop:16, gap:6 },
  back:        { alignSelf:'flex-start', marginBottom:12 },
  backTxt:     { color:C.muted, fontFamily:'Outfit_500Medium', fontSize:14 },
  avatar:      { width:90, height:90, borderRadius:45, backgroundColor:'rgba(214,63,110,0.2)',
                 borderWidth:2, borderColor:'rgba(214,63,110,0.4)',
                 alignItems:'center', justifyContent:'center' },
  avatarTxt:   { fontSize:36, color:C.rose, fontFamily:'Outfit_700Bold' },
  name:        { fontSize:24, color:C.white, fontFamily:'Outfit_700Bold', marginTop:6 },
  region:      { fontSize:13, color:C.muted, fontFamily:'Outfit_400Regular' },
  stats:       { flexDirection:'row', gap:20, marginTop:16 },
  stat:        { alignItems:'center', gap:2 },
  statVal:     { fontSize:15, color:C.white, fontFamily:'Outfit_700Bold' },
  statLabel:   { fontSize:10, color:C.muted, fontFamily:'Outfit_400Regular' },
  section:     { padding:20, gap:10 },
  sectionTitle:{ fontSize:13, color:C.muted, letterSpacing:1.5,
                 textTransform:'uppercase', fontFamily:'Outfit_500Medium' },
  bio:         { color:C.white, fontFamily:'Outfit_400Regular', fontSize:15, lineHeight:22 },
  chips:       { flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip:        { backgroundColor:C.card, borderWidth:1, borderColor:C.border,
                 borderRadius:99, paddingHorizontal:12, paddingVertical:6 },
  chipTxt:     { color:C.muted, fontFamily:'Outfit_400Regular', fontSize:12 },
  reviewCard:  { backgroundColor:C.card, borderRadius:12, padding:14,
                 borderWidth:1, borderColor:C.border, gap:4 },
  stars:       { fontSize:14 },
  comment:     { color:C.muted, fontFamily:'Outfit_400Regular', fontSize:13 },
  cta:         { flexDirection:'row', gap:10, padding:16,
                 borderTopWidth:1, borderTopColor:C.border, backgroundColor:C.bg },
  chatBtn:     { flex:1, backgroundColor:C.card, borderWidth:1, borderColor:C.border,
                 borderRadius:12, padding:14, alignItems:'center' },
  chatBtnTxt:  { color:C.white, fontFamily:'Outfit_700Bold', fontSize:14 },
  callBtn:     { flex:2, backgroundColor:C.rose, borderRadius:12, padding:14, alignItems:'center' },
  callBtnTxt:  { color:'#fff', fontFamily:'Outfit_700Bold', fontSize:14 },
})
