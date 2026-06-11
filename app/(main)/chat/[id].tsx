import { useState, useEffect, useRef } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity,
         StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { C } from '../../../lib/theme'

export default function Chat() {
  const router      = useRouter()
  const { id }      = useLocalSearchParams<{ id: string }>()
  const flatRef     = useRef<FlatList>(null)
  const [host, setHost]       = useState<any>(null)
  const [userId, setUserId]   = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput]     = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user!.id)
      const { data: h } = await supabase.from('profiles').select('*').eq('id', id).single()
      setHost(h)
      const { data: msgs } = await supabase.from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user!.id})`)
        .order('created_at', { ascending: true })
      setMessages(msgs || [])
    }
    init()

    const channel = supabase
      .channel('chat-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => setMessages(p => [...p, payload.new]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const send = async () => {
    if (!input.trim() || !userId) return
    const text = input.trim()
    setInput('')
    await supabase.from('messages').insert({
      sender_id: userId, receiver_id: id, content: text,
    })
  }

  const fmt = (d: string) => new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.name}>{host?.name}</Text>
        <TouchableOpacity
          style={s.callBtn}
          onPress={() => router.push({ pathname: '/(main)/call/[id]', params: { id } })}>
          <Text style={s.callBtnTxt}>Call</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.list}
          onContentSizeChange={() => flatRef.current?.scrollToEnd()}
          renderItem={({ item: msg }) => {
            const mine = msg.sender_id === userId
            return (
              <View style={[s.row, mine && s.rowMe]}>
                <View style={[s.bubble, mine && s.bubbleMe]}>
                  <Text style={s.bubbleTxt}>{msg.content}</Text>
                  <Text style={s.time}>{fmt(msg.created_at)}</Text>
                </View>
              </View>
            )
          }}
        />

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={input} onChangeText={setInput}
            onSubmitEditing={send}
            placeholder="Message…"
            placeholderTextColor={C.muted}
            returnKeyType="send"
          />
          <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendOff]}
            onPress={send} disabled={!input.trim()}>
            <Text style={{ color:'#fff', fontFamily:'Outfit_700Bold' }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:      { flex:1, backgroundColor:C.bg },
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
               padding:16, borderBottomWidth:1, borderBottomColor:C.border },
  back:      { color:C.muted, fontFamily:'Outfit_500Medium', fontSize:14 },
  name:      { color:C.white, fontFamily:'Outfit_700Bold', fontSize:16 },
  callBtn:   { backgroundColor:C.rose, borderRadius:99, paddingHorizontal:14, paddingVertical:6 },
  callBtnTxt:{ color:'#fff', fontFamily:'Outfit_700Bold', fontSize:12 },
  list:      { padding:16, gap:6 },
  row:       { flexDirection:'row' },
  rowMe:     { justifyContent:'flex-end' },
  bubble:    { maxWidth:'78%', backgroundColor:C.card, borderRadius:16,
               borderBottomLeftRadius:4, padding:12, borderWidth:1, borderColor:C.border, gap:3 },
  bubbleMe:  { backgroundColor:'rgba(214,63,110,0.2)', borderColor:'rgba(214,63,110,0.3)',
               borderBottomLeftRadius:16, borderBottomRightRadius:4 },
  bubbleTxt: { color:C.white, fontFamily:'Outfit_400Regular', fontSize:14, lineHeight:20 },
  time:      { color:C.muted, fontFamily:'Outfit_400Regular', fontSize:10, alignSelf:'flex-end' },
  inputBar:  { flexDirection:'row', gap:8, padding:12,
               borderTopWidth:1, borderTopColor:C.border },
  input:     { flex:1, backgroundColor:C.card, borderWidth:1, borderColor:C.border,
               borderRadius:22, paddingHorizontal:14, paddingVertical:10,
               color:C.white, fontFamily:'Outfit_400Regular', fontSize:14 },
  sendBtn:   { width:42, height:42, borderRadius:21, backgroundColor:C.rose,
               alignItems:'center', justifyContent:'center' },
  sendOff:   { backgroundColor:'rgba(255,255,255,0.08)' },
})
