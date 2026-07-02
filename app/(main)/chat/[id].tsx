import { useState, useEffect, useRef } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity,
         StyleSheet, KeyboardAvoidingView, Platform, Modal, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../../lib/supabase'
import { C } from '../../../lib/theme'
import { GiftIcon, GIFTS, TIER_LABELS } from '../../../components/GiftIcons'

const API = 'https://sparkcall.vercel.app'

export default function ChatScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()
  const insets  = useSafeAreaInsets()
  const listRef = useRef<FlatList>(null)

  const [host, setHost]         = useState<any>(null)
  const [me, setMe]             = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput]       = useState('')
  const [giftOpen, setGiftOpen] = useState(false)
  const [credits, setCredits]   = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: h }, { data: m }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      setHost(h); setMe(m); setCredits(m?.credits ?? 0)

      // Load existing messages
      const { data: msgs } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
      setMessages(msgs || [])

      // Real-time subscription
      supabase.channel(`chat-${user.id}-${id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
        }, (payload) => {
          const msg = payload.new
          const relevant = (msg.sender_id === user.id && msg.receiver_id === id) ||
                           (msg.sender_id === id && msg.receiver_id === user.id)
          if (!relevant) return
          setMessages(prev => [...prev, msg])
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
        })
        .subscribe()
    }
    init()
  }, [id])

  const sendMessage = async (content: string, isGift = false) => {
    if (!content.trim() || !me) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setInput('')
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: id,
      content,
    })
  }

  const sendGift = async (gift: typeof GIFTS[0]) => {
    if (credits < gift.cost || !me) return
    setCredits(c => c - gift.cost)
    setGiftOpen(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await Promise.all([
      supabase.from('gifts').insert({
        sender_id: user.id, receiver_id: id,
        gift_type: gift.id, cost_sparks: gift.cost,
      }),
      supabase.rpc('add_sparks', { user_id: user.id, amount: -gift.cost }),
      sendMessage(JSON.stringify({ type: 'gift', id: gift.id, name: gift.name, cost: gift.cost }), true),
    ])
  }

  const fmtTime = (ts: string) => {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const parseGift = (content: string) => {
    try {
      const p = JSON.parse(content)
      return p.type === 'gift' ? p : null
    } catch { return null }
  }

  const renderMsg = ({ item }: any) => {
    const fromMe = item.sender_id === me?.id
    const gift   = parseGift(item.content)
    return (
      <View style={[s.msgRow, fromMe && s.msgRowMe]}>
        <View style={[s.bubble, fromMe ? s.bubbleMe : s.bubbleThem,
          gift && s.giftBubble]}>
          {gift ? (
            <View style={s.giftMsgInner}>
              <GiftIcon id={gift.id} size={48}/>
              <Text style={s.giftMsgName}>{gift.name}</Text>
              <Text style={s.giftMsgCost}>⚡{gift.cost}</Text>
            </View>
          ) : (
            <Text style={s.bubbleTxt}>{item.content}</Text>
          )}
          <Text style={s.bubbleTime}>{fmtTime(item.created_at)}</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerName}>{host?.name}</Text>
        <TouchableOpacity style={s.callPill}
          onPress={() => router.push({ pathname: '/(main)/call/[id]', params: {
            id, callerCredits: String(me?.credits ?? 0), callerPremium: me?.premium ?? ''
          }})}>
          <Text style={s.callPillTxt}>Call</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMsg}
        contentContainerStyle={s.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Input bar */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={s.giftBtn} onPress={() => setGiftOpen(true)}>
          <Text style={{ fontSize: 20 }}>🎁</Text>
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          placeholder="Message…"
          placeholderTextColor={C.muted}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && s.sendBtnOff]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim()}>
          <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Gift Modal */}
      <Modal visible={giftOpen} transparent animationType="slide"
        onRequestClose={() => setGiftOpen(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setGiftOpen(false)}>
          <View style={[s.giftPanel, { paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}>
            <View style={s.giftHeader}>
              <View>
                <Text style={s.giftTitle}>Send a Gift</Text>
                <Text style={s.giftBal}>⚡ <Text style={{ color: C.gold }}>{credits.toLocaleString()}</Text> balance</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setGiftOpen(false)}>
                <Text style={{ color: C.muted, fontSize: 22 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(GIFTS.reduce((acc: any, g) => {
                if (!acc[g.tier]) acc[g.tier] = []
                acc[g.tier].push(g)
                return acc
              }, {})).map(([tier, tg]: any) => (
                <View key={tier} style={{ marginBottom: 16 }}>
                  <Text style={s.tierLabel}>{TIER_LABELS[tier]}</Text>
                  <View style={s.giftGrid}>
                    {tg.map((g: typeof GIFTS[0]) => {
                      const can = credits >= g.cost
                      return (
                        <TouchableOpacity key={g.id}
                          onPress={() => can && sendGift(g)}
                          style={[s.giftItem, !can && { opacity: 0.3 }]}>
                          <GiftIcon id={g.id} size={32}/>
                          <Text style={s.giftName} numberOfLines={1}>{g.name}</Text>
                          <Text style={s.giftCost}>⚡{g.cost >= 1000 ? `${g.cost/1000}K` : g.cost}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingBottom: 12,
                  borderBottomWidth: 1, borderBottomColor: C.border,
                  backgroundColor: C.card },
  backBtn:      { padding: 4 },
  backTxt:      { color: C.rose, fontFamily: 'Outfit_500Medium', fontSize: 14 },
  headerName:   { color: C.white, fontFamily: 'Outfit_700Bold', fontSize: 16 },
  callPill:     { backgroundColor: C.rose, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  callPillTxt:  { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 13 },
  listContent:  { padding: 16, gap: 8 },
  msgRow:       { flexDirection: 'row', marginBottom: 8 },
  msgRowMe:     { justifyContent: 'flex-end' },
  bubble:       { maxWidth: '75%', padding: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMe:     { backgroundColor: C.rose, borderBottomRightRadius: 4 },
  bubbleThem:   { backgroundColor: C.card, borderBottomLeftRadius: 4,
                  borderWidth: 1, borderColor: C.border },
  bubbleTxt:    { color: C.white, fontFamily: 'Outfit_400Regular', fontSize: 14 },
  bubbleTime:   { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  giftBubble:   { alignItems: 'center', paddingVertical: 14 },
  giftMsgInner: { alignItems: 'center', gap: 4 },
  giftMsgName:  { color: C.white, fontFamily: 'Outfit_700Bold', fontSize: 13, marginTop: 4 },
  giftMsgCost:  { color: C.gold, fontFamily: 'Outfit_700Bold', fontSize: 12 },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8,
                  paddingHorizontal: 12, paddingTop: 10,
                  borderTopWidth: 1, borderTopColor: C.border,
                  backgroundColor: C.card },
  giftBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input:        { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: C.border, borderRadius: 20,
                  paddingHorizontal: 14, paddingVertical: 10,
                  color: C.white, fontFamily: 'Outfit_400Regular',
                  fontSize: 14, maxHeight: 100 },
  sendBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: C.rose,
                  alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:   { backgroundColor: 'rgba(255,255,255,0.1)' },
  modalBg:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  giftPanel:    { backgroundColor: C.card, borderTopWidth: 1,
                  borderTopColor: 'rgba(201,164,106,0.2)', padding: 18, maxHeight: '75%' },
  giftHeader:   { flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 16 },
  giftTitle:    { fontSize: 20, color: C.white, fontFamily: 'Outfit_700Bold' },
  giftBal:      { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  alignItems: 'center', justifyContent: 'center' },
  tierLabel:    { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2,
                  textTransform: 'uppercase', marginBottom: 8 },
  giftGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  giftItem:     { width: '14%', alignItems: 'center', gap: 3,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12, paddingVertical: 10, paddingHorizontal: 2 },
  giftName:     { fontSize: 7, color: C.white, textAlign: 'center', fontFamily: 'Outfit_500Medium' },
  giftCost:     { fontSize: 8, color: C.gold, fontFamily: 'Outfit_700Bold' },
})
