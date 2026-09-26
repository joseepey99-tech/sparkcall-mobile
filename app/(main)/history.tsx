import { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

export default function HistoryScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

    useFocusEffect(useCallback(() => { load() }, []))

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${user.id},host_id.eq.${user.id}`)
      .eq('status', 'ended')
      .order('created_at', { ascending: false })

    if (!calls || calls.length === 0) { setItems([]); setLoading(false); return }

    const otherIds = [...new Set(calls.map(c => c.caller_id === user.id ? c.host_id : c.caller_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds)
    const profileMap: Record<string, any> = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    const callIds = calls.map(c => c.id)
    const { data: reviews } = await supabase.from('reviews').select('*').in('call_id', callIds)

    const merged = calls.map(c => {
      const iAmHost = c.host_id === user.id
      const otherId = iAmHost ? c.caller_id : c.host_id
      const myRole = iAmHost ? 'host' : 'caller'
      const myReview = reviews?.find(r => r.call_id === c.id && r.reviewer_role === myRole)
      return {
        ...c,
        otherName: profileMap[otherId]?.name || 'Unknown',
        otherId,
        iAmHost,
        myReview,
      }
    })

    setItems(merged)
    setLoading(false)
  }

  const fmt = (s: number) => `${Math.floor((s || 0) / 60)}m ${(s || 0) % 60}s`

  const renderItem = ({ item }: any) => (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.name}>{item.otherName}</Text>
        <Text style={s.role}>{item.iAmHost ? 'You hosted' : 'You called'}</Text>
      </View>
      <Text style={s.meta}>{fmt(item.duration_seconds)} · ⚡{item.sparks_spent || 0}</Text>
      {item.myReview ? (
        <Text style={s.reviewed}>⭐ You rated {item.myReview.rating}/5</Text>
      ) : (
        <TouchableOpacity
          style={s.reviewBtn}
          onPress={() => router.push({
            pathname: '/(main)/review/[id]',
            params: {
              id: item.otherId,
              duration: item.duration_seconds,
              cost: item.sparks_spent,
              isHost: item.iAmHost ? 'true' : 'false',
              callId: item.id,
            },
          })}>
          <Text style={s.reviewBtnTxt}>Leave a review</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Call History</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.rose} />
      ) : items.length === 0 ? (
        <Text style={s.empty}>No calls yet.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  header:     { padding: 20, paddingBottom: 8 },
  title:      { fontSize: 24, color: C.white, fontFamily: 'Outfit_700Bold' },
  empty:      { color: C.muted, textAlign: 'center', marginTop: 40, fontFamily: 'Outfit_400Regular' },
  card:       { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, gap: 6 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name:       { color: C.white, fontSize: 16, fontFamily: 'Outfit_700Bold' },
  role:       { color: C.muted, fontSize: 11, fontFamily: 'Outfit_400Regular' },
  meta:       { color: C.muted, fontSize: 13, fontFamily: 'Outfit_400Regular' },
  reviewed:   { color: C.gold, fontSize: 13, fontFamily: 'Outfit_500Medium', marginTop: 2 },
  reviewBtn:  { backgroundColor: C.rose, borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  reviewBtnTxt: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 13 },
})