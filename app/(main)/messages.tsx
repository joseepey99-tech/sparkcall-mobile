import { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Image, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

export default function MessagesScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<any[]>([])

  useFocusEffect(useCallback(() => { load() }, []))

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!msgs || msgs.length === 0) { setConversations([]); setLoading(false); return }

    const latestByPartner: Record<string, any> = {}
    for (const m of msgs) {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (!partnerId) continue
      if (!latestByPartner[partnerId]) latestByPartner[partnerId] = m
    }

    const partnerIds = Object.keys(latestByPartner)
    const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', partnerIds)
    const profileMap: Record<string, any> = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    const list = partnerIds.map(pid => ({
      partnerId: pid,
      partner: profileMap[pid],
      lastMessage: latestByPartner[pid],
    })).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime())

    setConversations(list)
    setLoading(false)
  }

  const renderItem = ({ item }: any) => {
    const isGift = (() => { try { return JSON.parse(item.lastMessage.content)?.type === 'gift' } catch { return false } })()
    return (
      <TouchableOpacity style={s.row}
        onPress={() => router.push({ pathname: '/(main)/chat/[id]', params: { id: item.partnerId } })}>
        <View style={s.avatar}>
          {item.partner?.avatar_url ? (
            <Image source={{ uri: item.partner.avatar_url }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarTxt}>{item.partner?.name?.charAt(0) || '?'}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{item.partner?.name || 'Unknown'}</Text>
          <Text style={s.preview} numberOfLines={1}>{isGift ? '🎁 Sent a gift' : item.lastMessage.content}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.rose} />
      ) : conversations.length === 0 ? (
        <Text style={s.empty}>No conversations yet.</Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.partnerId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 4 }}
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
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(214,63,110,0.2)',
                borderWidth: 1, borderColor: 'rgba(214,63,110,0.4)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:  { width: 48, height: 48, borderRadius: 24 },
  avatarTxt:  { fontSize: 18, color: C.rose, fontFamily: 'Outfit_700Bold' },
  name:       { color: C.white, fontSize: 15, fontFamily: 'Outfit_700Bold' },
  preview:    { color: C.muted, fontSize: 13, fontFamily: 'Outfit_400Regular', marginTop: 2 },
})