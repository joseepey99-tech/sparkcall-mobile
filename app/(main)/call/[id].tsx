'use client'
import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet,
         Animated, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native'
import { WebView } from 'react-native-webview'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Mic, MicOff, Video, VideoOff, Gift, PhoneOff, Send } from 'lucide-react-native'
import { supabase } from '../../../lib/supabase'
import { GiftIcon, GIFTS, TIER_LABELS } from '../../../components/GiftIcons'
import { C } from '../../../lib/theme'
import { ScrollView } from 'react-native-gesture-handler'

const API = 'https://sparkcall.vercel.app'

export default function CallScreen() {
  const router           = useRouter()
  const { id }           = useLocalSearchParams<{ id: string }>()
  const webViewRef        = useRef<WebView>(null)
  const timerRef          = useRef<ReturnType<typeof setInterval>>()
  const msgIdRef          = useRef(0)

  const [host, setHost]               = useState<any>(null)
  const [profile, setProfile]         = useState<any>(null)
  const [roomUrl, setRoomUrl]         = useState<string | null>(null)
  const [callData, setCallData]       = useState<any>(null)
  const [seconds, setSeconds]         = useState(0)
  const [muted, setMuted]             = useState(false)
  const [camOff, setCamOff]           = useState(false)
  const [giftOpen, setGiftOpen]       = useState(false)
  const [chatVisible, setChatVisible] = useState(true)
  const [chatInput, setChatInput]     = useState('')
  const [messages, setMessages]       = useState<any[]>([])
  const [credits, setCredits]         = useState(0)
  const [flyingGift, setFlyingGift]   = useState<any>(null)
  const [ending, setEnding]           = useState(false)

  useEffect(() => { initCall() }, [id])
  useEffect(() => () => { clearInterval(timerRef.current) }, [])

  const initCall = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }
    const [{ data: prof }, { data: h }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', id).single(),
    ])
    setProfile(prof); setHost(h); setCredits(prof.credits)
    const res = await fetch(`${API}/api/calls/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: id }),
    })
    const data = await res.json()
    if (!data.roomUrl) { router.back(); return }
    setCallData(data)
    setRoomUrl(data.roomUrl)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  const getRate = () => {
    if (!profile || !host) return 0
    const d = profile.premium === 'platinum' ? 0.8 : profile.premium === 'gold' ? 0.9 : 1
    return Math.round(host.rate * d)
  }
  const sparksSpent = () => Math.floor((seconds / 60) * getRate())

  const toggleMic = () => {
    const next = !muted
    setMuted(next)
    webViewRef.current?.injectJavaScript(`
      if(window.__daily) window.__daily.setLocalAudio(${!next}); true;
    `)
  }

  const toggleCam = () => {
    const next = !camOff
    setCamOff(next)
    webViewRef.current?.injectJavaScript(`
      if(window.__daily) window.__daily.setLocalVideo(${!next}); true;
    `)
  }

  const addMessage = (text: string, fromMe: boolean) => {
    const mid = ++msgIdRef.current
    setMessages(prev => [...prev.slice(-5), { id: mid, text, fromMe, fading: false }])
    setTimeout(() => setMessages(p => p.map(m => m.id === mid ? { ...m, fading: true } : m)), 4000)
    setTimeout(() => setMessages(p => p.filter(m => m.id !== mid)), 6500)
  }

  const sendMessage = () => {
    if (!chatInput.trim()) return
    addMessage(chatInput.trim(), true)
    setChatInput('')
  }

  const sendGift = async (gift: typeof GIFTS[0]) => {
    if (credits < gift.cost) return
    setCredits(c => c - gift.cost)
    setFlyingGift(gift)
    setGiftOpen(false)
    addMessage(`✨ Sent ${gift.name}`, true)
    setTimeout(() => setFlyingGift(null), 2200)
    const { data: { user } } = await supabase.auth.getUser()
    await Promise.all([
      supabase.from('gifts').insert({ sender_id: user!.id, receiver_id: id,
        call_id: callData?.callId, gift_type: gift.id, cost_sparks: gift.cost }),
      supabase.rpc('add_sparks', { user_id: user!.id, amount: -gift.cost }),
    ])
  }

  const endCall = async () => {
    if (ending) return
    setEnding(true)
    clearInterval(timerRef.current)
    webViewRef.current?.injectJavaScript(`if(window.__daily) window.__daily.destroy(); true;`)
    const spent = sparksSpent()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await fetch(`${API}/api/calls/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: callData?.callId, roomName: callData?.roomName,
          durationSeconds: seconds, sparksSpent: spent, callerId: user?.id }),
      })
    } catch(e) { console.error(e) }
    router.replace({ pathname: '/(main)/review/[id]', params: { id, duration: seconds, cost: spent }})
  }

  const fmtCost = (n: number) => n >= 1000 ? `${n/1000}K` : n

  // Daily.co HTML injected into WebView
  const callHtml = roomUrl ? `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;overflow:hidden}</style>
</head><body>
<script src="https://unpkg.com/@daily-co/daily-js"></script>
<script>
  const frame = window.__daily = DailyIframe.createFrame({
    iframeStyle:{position:'fixed',inset:0,width:'100%',height:'100%',border:'none'},
    showLeaveButton:false,showFullscreenButton:false,showLocalVideo:true,
  });
  frame.join({url:'${roomUrl}'});
</script></body></html>` : null

  return (
    <View style={s.root}>
      {/* VIDEO */}
      <TouchableOpacity
        style={s.videoArea}
        activeOpacity={1}
        onPress={() => { if (giftOpen) setGiftOpen(false); else setChatVisible(v => !v) }}
      >
        {callHtml ? (
          <WebView
            ref={webViewRef}
            source={{ html: callHtml }}
            style={StyleSheet.absoluteFillObject}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled
            mediaCapturePermissionGrantType="grant"
          />
        ) : (
          <View style={s.connecting}>
            <View style={s.connectAvatar}>
              <Text style={s.connectAvatarTxt}>{host?.name?.charAt(0)}</Text>
            </View>
            <Text style={s.connectTxt}>Connecting…</Text>
          </View>
        )}

        {/* Top gradient */}
        <View style={s.topGrad} pointerEvents="none"/>

        {/* Host info */}
        <View style={s.hostRow} pointerEvents="none">
          <View style={s.hostAv}>
            <Text style={s.hostAvTxt}>{host?.name?.charAt(0)}</Text>
          </View>
          <View>
            <Text style={s.hostName}>{host?.name?.split(' ')[0]}</Text>
            <View style={s.liveRow}>
              <View style={s.liveDot}/>
              <Text style={s.liveTxt}>Live</Text>
            </View>
          </View>
        </View>

        {/* Timer */}
        <View style={s.timerBox} pointerEvents="none">
          <Text style={s.timerVal}>{fmt(seconds)}</Text>
          <Text style={s.timerSparks}>⚡ {sparksSpent()}</Text>
        </View>

        {/* Flying gift */}
        {flyingGift && (
          <View style={s.flyingGift} pointerEvents="none">
            <GiftIcon id={flyingGift.id} size={80}/>
          </View>
        )}

        {/* Floating messages */}
        {chatVisible && messages.length > 0 && (
          <View style={s.messagesArea} pointerEvents="none">
            {messages.map(msg => (
              <View key={msg.id}
                style={[s.msgRow, msg.fromMe && s.msgRowMe,
                        { opacity: msg.fading ? 0 : 1 }]}>
                {!msg.fromMe && (
                  <View style={s.msgAv}>
                    <Text style={s.msgAvTxt}>{host?.name?.charAt(0)}</Text>
                  </View>
                )}
                <View style={[s.msgBubble, msg.fromMe && s.msgBubbleMe]}>
                  <Text style={s.msgTxt}>{msg.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tap hint */}
        {!chatVisible && !giftOpen && (
          <Text style={s.tapHint} pointerEvents="none">tap to show chat</Text>
        )}
      </TouchableOpacity>

      {/* INPUT BAR */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={sendMessage}
          placeholder={host ? `Message ${host.name.split(' ')[0]}…` : 'Message…'}
          placeholderTextColor={C.muted}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, !chatInput.trim() && s.sendBtnOff]}
          onPress={sendMessage}
          disabled={!chatInput.trim()}
        >
          <Send size={15} color="#fff"/>
        </TouchableOpacity>
      </View>

      {/* CONTROLS */}
      <View style={s.controls}>
        <View style={s.pill}>
          <TouchableOpacity style={[s.ctl, muted && s.ctlActive]} onPress={toggleMic}>
            {muted ? <MicOff size={19} color={muted ? '#fff' : 'rgba(255,255,255,0.7)'}/> : <Mic size={19} color="rgba(255,255,255,0.7)"/>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.ctl, camOff && s.ctlActive]} onPress={toggleCam}>
            {camOff ? <VideoOff size={19} color="#fff"/> : <Video size={19} color="rgba(255,255,255,0.7)"/>}
          </TouchableOpacity>
          <View style={s.divider}/>
          <TouchableOpacity style={[s.ctl, giftOpen && s.ctlGiftActive]} onPress={() => setGiftOpen(v => !v)}>
            <Gift size={19} color={giftOpen ? C.gold : 'rgba(201,164,106,0.8)'}/>
          </TouchableOpacity>
          <View style={s.divider}/>
          <TouchableOpacity style={s.endBtn} onPress={endCall} disabled={ending}>
            <PhoneOff size={22} color="#fff"/>
          </TouchableOpacity>
        </View>
        <Text style={s.balance}>⚡ {credits.toLocaleString()} balance</Text>
      </View>

      {/* GIFT PANEL */}
      {giftOpen && (
        <View style={s.giftPanel}>
          <View style={s.giftHeader}>
            <View>
              <Text style={s.giftTitle}>Send a Gift</Text>
              <Text style={s.giftBalance}>Balance: <Text style={{ color: C.gold }}>⚡ {credits.toLocaleString()}</Text></Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={() => setGiftOpen(false)}>
              <Text style={{ color: C.muted, fontSize: 20 }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(
              GIFTS.reduce((acc: any, g) => {
                if (!acc[g.tier]) acc[g.tier] = []
                acc[g.tier].push(g); return acc
              }, {})
            ).map(([tier, tierGifts]: any) => (
              <View key={tier} style={s.giftTier}>
                <Text style={s.tierLabel}>{TIER_LABELS[tier]}</Text>
                <View style={s.giftGrid}>
                  {tierGifts.map((g: typeof GIFTS[0]) => {
                    const can = credits >= g.cost
                    return (
                      <TouchableOpacity key={g.id} onPress={() => can && sendGift(g)}
                        style={[s.giftItem, !can && s.giftItemOff]}>
                        <GiftIcon id={g.id} size={32}/>
                        <Text style={s.giftName} numberOfLines={1}>{g.name}</Text>
                        <Text style={s.giftCost}>⚡{fmtCost(g.cost)}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            ))}

            {/* Top up */}
            <View style={s.topUp}>
              <Text style={s.topUpTitle}>Need more Sparks?</Text>
              <View style={s.topUpRow}>
                {[{id:'starter',sparks:200,price:'$2.99'},{id:'popular',sparks:600,price:'$7.99'},{id:'bestvalue',sparks:2000,price:'$19.99'}].map(p => (
                  <TouchableOpacity key={p.id} style={s.packBtn}
                    onPress={async () => {
                      const r = await fetch(`${API}/api/payments/create-session`, {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ packId: p.id }),
                      })
                      const { url } = await r.json()
                      if (url) { const { openBrowserAsync } = await import('expo-web-browser'); openBrowserAsync(url) }
                    }}>
                    <Text style={s.packSparks}>⚡ {p.sparks}</Text>
                    <Text style={s.packPrice}>{p.price}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#000' },
  videoArea:      { flex: 1, position: 'relative', backgroundColor: '#0A0810', overflow: 'hidden' },
  topGrad:        { position:'absolute', top:0, left:0, right:0, height:90,
                    backgroundColor:'rgba(0,0,0,0)', },
  connecting:     { flex:1, alignItems:'center', justifyContent:'center', gap:14 },
  connectAvatar:  { width:90, height:90, borderRadius:45, backgroundColor:'rgba(214,63,110,0.3)',
                    alignItems:'center', justifyContent:'center' },
  connectAvatarTxt: { fontSize:36, color:C.rose, fontFamily:'Outfit_700Bold' },
  connectTxt:     { color:'rgba(255,255,255,0.5)', fontFamily:'Outfit_400Regular', fontSize:13 },
  hostRow:        { position:'absolute', top:14, left:14, flexDirection:'row', alignItems:'center', gap:8 },
  hostAv:         { width:32, height:32, borderRadius:16, backgroundColor:'rgba(214,63,110,0.5)',
                    alignItems:'center', justifyContent:'center',
                    borderWidth:1.5, borderColor:'rgba(255,255,255,0.25)' },
  hostAvTxt:      { fontSize:13, color:'#fff', fontFamily:'Outfit_700Bold' },
  hostName:       { color:'#fff', fontSize:13, fontFamily:'Outfit_700Bold' },
  liveRow:        { flexDirection:'row', alignItems:'center', gap:4, marginTop:1 },
  liveDot:        { width:5, height:5, borderRadius:3, backgroundColor:C.success },
  liveTxt:        { color:'rgba(255,255,255,0.6)', fontSize:10, fontFamily:'Outfit_400Regular' },
  timerBox:       { position:'absolute', top:14, right:14, alignItems:'flex-end' },
  timerVal:       { fontFamily:'monospace', fontSize:22, fontWeight:'700', color:'#fff' },
  timerSparks:    { color:C.gold, fontSize:10, fontFamily:'Outfit_400Regular', marginTop:1 },
  flyingGift:     { position:'absolute', top:'20%', left:'50%', marginLeft:-40, zIndex:50 },
  messagesArea:   { position:'absolute', left:0, bottom:10, width:'68%',
                    paddingHorizontal:12, gap:5 },
  msgRow:         { flexDirection:'row', alignItems:'flex-end', gap:5 },
  msgRowMe:       { flexDirection:'row-reverse' },
  msgAv:          { width:18, height:18, borderRadius:9, backgroundColor:'rgba(214,63,110,0.7)',
                    alignItems:'center', justifyContent:'center', flexShrink:0 },
  msgAvTxt:       { fontSize:8, color:'#fff', fontFamily:'Outfit_700Bold' },
  msgBubble:      { padding:6, paddingHorizontal:11, borderRadius:12, maxWidth:'85%',
                    backgroundColor:'rgba(0,0,0,0.22)',
                    borderLeftWidth:2, borderLeftColor:'rgba(214,63,110,0.7)',
                    borderBottomRightRadius:12, borderBottomLeftRadius:3 },
  msgBubbleMe:    { borderLeftWidth:0, borderRightWidth:2, borderRightColor:'rgba(201,164,106,0.7)',
                    borderBottomLeftRadius:12, borderBottomRightRadius:3 },
  msgTxt:         { color:'#fff', fontSize:12, fontFamily:'Outfit_400Regular' },
  tapHint:        { position:'absolute', bottom:12, alignSelf:'center',
                    color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'Outfit_400Regular' },
  inputBar:       { backgroundColor:'rgba(6,4,14,0.92)', borderTopWidth:1,
                    borderTopColor:'rgba(255,255,255,0.06)',
                    paddingHorizontal:12, paddingVertical:8,
                    flexDirection:'row', alignItems:'center', gap:9 },
  input:          { flex:1, backgroundColor:'rgba(255,255,255,0.08)',
                    borderWidth:1, borderColor:'rgba(255,255,255,0.1)',
                    borderRadius:22, paddingHorizontal:14, paddingVertical:9,
                    color:'#fff', fontFamily:'Outfit_400Regular', fontSize:13 },
  sendBtn:        { width:36, height:36, borderRadius:18,
                    backgroundColor:C.rose,
                    alignItems:'center', justifyContent:'center' },
  sendBtnOff:     { backgroundColor:'rgba(255,255,255,0.08)' },
  controls:       { backgroundColor:'rgba(6,4,14,0.92)', paddingHorizontal:16,
                    paddingTop:10, paddingBottom:28, alignItems:'center', gap:8 },
  pill:           { flexDirection:'row', alignItems:'center', gap:6,
                    backgroundColor:'rgba(255,255,255,0.07)',
                    borderWidth:1, borderColor:'rgba(255,255,255,0.1)',
                    borderRadius:99, paddingHorizontal:16, paddingVertical:8 },
  ctl:            { width:44, height:44, borderRadius:22,
                    alignItems:'center', justifyContent:'center' },
  ctlActive:      { backgroundColor:'rgba(255,255,255,0.18)' },
  ctlGiftActive:  { backgroundColor:'rgba(201,164,106,0.2)' },
  divider:        { width:1, height:22, backgroundColor:'rgba(255,255,255,0.12)', marginHorizontal:3 },
  endBtn:         { width:52, height:52, borderRadius:26, backgroundColor:C.rose,
                    alignItems:'center', justifyContent:'center' },
  balance:        { color:'rgba(255,255,255,0.28)', fontSize:10, fontFamily:'Outfit_400Regular' },
  giftPanel:      { position:'absolute', bottom:0, left:0, right:0,
                    backgroundColor:'rgba(8,5,18,0.97)',
                    borderTopWidth:1, borderTopColor:'rgba(201,164,106,0.2)',
                    padding:18, paddingBottom:32, maxHeight:'72%' },
  giftHeader:     { flexDirection:'row', justifyContent:'space-between',
                    alignItems:'center', marginBottom:16 },
  giftTitle:      { fontSize:20, color:'#fff', fontFamily:'Outfit_700Bold' },
  giftBalance:    { fontSize:11, color:'rgba(255,255,255,0.4)',
                    fontFamily:'Outfit_400Regular', marginTop:2 },
  closeBtn:       { width:30, height:30, borderRadius:15,
                    backgroundColor:'rgba(255,255,255,0.08)',
                    alignItems:'center', justifyContent:'center' },
  giftTier:       { marginBottom:18 },
  tierLabel:      { fontSize:9, color:'rgba(255,255,255,0.3)',
                    letterSpacing:2, textTransform:'uppercase',
                    fontFamily:'Outfit_500Medium', marginBottom:9 },
  giftGrid:       { flexDirection:'row', flexWrap:'wrap', gap:8 },
  giftItem:       { width:'14.5%', alignItems:'center', gap:3,
                    backgroundColor:'rgba(255,255,255,0.06)',
                    borderWidth:1, borderColor:'rgba(255,255,255,0.1)',
                    borderRadius:13, paddingVertical:10, paddingHorizontal:4 },
  giftItemOff:    { opacity:0.3 },
  giftName:       { fontSize:8, color:'#fff', textAlign:'center',
                    fontFamily:'Outfit_500Medium', lineHeight:11 },
  giftCost:       { fontSize:8, color:C.gold, fontFamily:'Outfit_700Bold' },
  topUp:          { borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.07)',
                    paddingTop:14, marginTop:4 },
  topUpTitle:     { color:'rgba(255,255,255,0.3)', fontSize:10, textAlign:'center',
                    fontFamily:'Outfit_400Regular', marginBottom:9 },
  topUpRow:       { flexDirection:'row', gap:8 },
  packBtn:        { flex:1, backgroundColor:'rgba(201,164,106,0.07)',
                    borderWidth:1, borderColor:'rgba(201,164,106,0.2)',
                    borderRadius:11, padding:10, alignItems:'center', gap:3 },
  packSparks:     { fontSize:12, color:C.gold, fontFamily:'Outfit_700Bold' },
  packPrice:      { fontSize:10, color:'rgba(255,255,255,0.4)', fontFamily:'Outfit_400Regular' },
})
