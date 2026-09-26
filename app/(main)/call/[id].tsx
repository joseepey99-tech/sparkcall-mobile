import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated, Dimensions } from 'react-native'
import { WebView } from 'react-native-webview'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Mic, MicOff, Video, VideoOff, Gift, PhoneOff, Send, FlipHorizontal, EyeOff, Eye } from 'lucide-react-native'
import { supabase } from '../../../lib/supabase'
import { GiftIcon, GIFTS, TIER_LABELS } from '../../../components/GiftIcons'
import { C } from '../../../lib/theme'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera } from 'expo-camera'
import { Audio } from 'expo-av'

const API = 'https://sparkcall.vercel.app'
const { width: SW } = Dimensions.get('window')

type CallPhase = 'calling' | 'accepted' | 'rejected' | 'timeout'

export default function CallScreen() {
  const router  = useRouter()
  const insets  = useSafeAreaInsets()
const { id, callerCredits, callerPremium, isHost, callId: routeCallId, roomUrl: routeRoomUrl } = useLocalSearchParams<{
    id: string; callerCredits?: string; callerPremium?: string; isHost?: string; callId?: string; roomUrl?: string
  }>()
  const initialized = useRef(false)
  const navigating  = useRef(false)
  const webViewRef  = useRef<WebView>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval>>()
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>>()
  const channelRef  = useRef<any>(null)
  const msgIdRef    = useRef(0)
  const chatScrollRef = useRef<any>(null)
  const pulseAnim   = useRef(new Animated.Value(1)).current
  const controlsFade    = useRef(new Animated.Value(1)).current
  const controlsTimer  = useRef<ReturnType<typeof setTimeout>>()

  const [phase, setPhase]           = useState<CallPhase>('calling')
  const [host, setHost]             = useState<any>(null)
  const [userId, setUserId]         = useState<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const [callId, setCallId]         = useState<string | null>(null)
  const [roomUrl, setRoomUrl]       = useState<string | null>(null)
  const [seconds, setSeconds]       = useState(0)
  const [waitSecs, setWaitSecs]     = useState(0)
  const [muted, setMuted]           = useState(false)
  const [camOff, setCamOff]         = useState(false)
  const [pipHidden, setPipHidden]   = useState(false)
  const [giftOpen, setGiftOpen]     = useState(false)
  const [chatInput, setChatInput]   = useState('')
  const [messages, setMessages]     = useState<any[]>([])
  const [credits, setCredits]       = useState(parseInt(callerCredits || '0') || 0)
  const [rate, setRate]             = useState(0)
  const [lowCredits, setLowCredits] = useState(false)
  const [flyingGift, setFlyingGift] = useState<any>(null)
  const [ending, setEnding]         = useState(false)
  const [callReady, setCallReady]   = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showChat, setShowChat]             = useState(false)

  // Fetch credits
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
      if (data?.credits !== undefined) setCredits(data.credits)
    })
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    initCall()
  }, [id])

  // Pulse animation for calling phase
  useEffect(() => {
    if (phase !== 'calling') return
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: false }),
    ]))
    anim.start()
    return () => anim.stop()
  }, [phase])

  // 30s timeout while calling
  useEffect(() => {
    if (phase !== 'calling') return
    const iv = setInterval(() => setWaitSecs(s => s + 1), 1000)
    timeoutRef.current = setTimeout(() => {
      clearInterval(iv); setPhase('timeout'); cancelCall()
    }, 30000)
    return () => { clearInterval(iv); clearTimeout(timeoutRef.current) }
  }, [phase])


  const showControls = () => {
    Animated.timing(controlsFade, { toValue: 1, duration: 200, useNativeDriver: false }).start()
    setControlsVisible(true)
    clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => {
      Animated.timing(controlsFade, { toValue: 0, duration: 800, useNativeDriver: false }).start()
      setControlsVisible(false)
    }, 4000)
  }

const initCall = async () => {
    try {
      await Camera.requestCameraPermissionsAsync()
      await Audio.requestPermissionsAsync()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/(auth)/login'); return }
      setUserId(user.id); userIdRef.current = user.id
      const { data: h } = await supabase.from('profiles').select('*').eq('id', id).single()
      setHost(h)

      const amHost = isHost === 'true'

      if (amHost && routeCallId) {
        // Host answering an already-accepted call — join directly, do NOT create a new call
        setCallId(routeCallId)
        setRoomUrl(routeRoomUrl || null)
        console.log('HOST JOIN DEBUG:', JSON.stringify({ routeCallId, routeRoomUrl, isHost }))
        setPhase('accepted')
        setTimeout(() => setCallReady(true), 1500)
        showControls()
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

        channelRef.current = supabase
          .channel(`call-${routeCallId}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'calls',
            filter: `id=eq.${routeCallId}`,
          }, (payload) => {
            if (payload.new.status === 'ended') {
              clearInterval(timerRef.current)
              channelRef.current?.unsubscribe()
              if (!navigating.current) {
                navigating.current = true
                const spent = sparksSpent()
                router.replace({ pathname: '/(main)/review/[id]', params: { id: id as string, duration: seconds, cost: spent, isHost: 'true', callId: routeCallId } })
              }
            }
          })
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `call_id=eq.${routeCallId}`,
          }, (payload) => {
            const msg = payload.new
            if (msg.sender_id === userIdRef.current) return
            addMessage(msg.content, false, msg.id)
          })
          .subscribe()
        return
      }

      // Caller flow — create a new call
      const premium  = callerPremium || ''
      const discount = premium === 'platinum' ? 0.8 : premium === 'gold' ? 0.9 : 1
      setRate(Math.round((h?.rate || 0) * discount))
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/calls/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ hostId: id }),
      })
      const data = await res.json()
      if (!data.callId || !data.roomUrl) {
        if (!navigating.current) { navigating.current = true; router.back() }
        return
      }
      setCallId(data.callId)
      setRoomUrl(data.roomUrl)
      channelRef.current = supabase
        .channel(`call-${data.callId}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'calls',
          filter: `id=eq.${data.callId}`,
        }, (payload) => {
          const status = payload.new.status
          if (status === 'accepted') {
            clearTimeout(timeoutRef.current)
            setPhase('accepted')
            setTimeout(() => setCallReady(true), 1500)
            showControls()
            timerRef.current = setInterval(() => {
              setSeconds(s => {
                const newS = s + 1
                const spent = Math.floor((newS / 60) * rate)
                const remaining = credits - spent
                if (remaining <= 0) { endCall(); return s }
                setLowCredits(remaining <= rate * 2)
                return newS
              })
            }, 1000)
          } else if (status === 'rejected') {
            clearTimeout(timeoutRef.current)
            setPhase('rejected')
            setTimeout(() => { if (!navigating.current) { navigating.current = true; router.back() } }, 2500)
          } else if (status === 'ended') {
            clearTimeout(timeoutRef.current)
            clearInterval(timerRef.current)
            channelRef.current?.unsubscribe()
            if (!navigating.current) {
              navigating.current = true
              const spent = sparksSpent()
              router.replace({ pathname: '/(main)/review/[id]', params: { id: id as string, duration: seconds, cost: spent, isHost: isHost || 'false', callId: callId || '' } })
            }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `call_id=eq.${data.callId}`,
        }, (payload) => {
          const msg = payload.new
          if (msg.sender_id === userIdRef.current) return
          addMessage(msg.content, false, msg.id)
        })
        .subscribe()
    } catch (err) {
      console.error('initCall:', err)
      if (!navigating.current) { navigating.current = true; router.back() }
    }
  }

  const cancelCall = async () => {
    if (!callId) return
    channelRef.current?.unsubscribe()
    await fetch(`${API}/api/calls/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId }),
    })
    if (!navigating.current) { navigating.current = true; router.back() }
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const sparksSpent = () => Math.floor((seconds / 60) * rate)

  // Controls — inject JS into WebView
  const toggleMic = () => {
    webViewRef.current?.injectJavaScript('window.scMute && window.scMute(); true;')
    setMuted(m => !m)
  }
  const toggleCam = () => {
    webViewRef.current?.injectJavaScript('window.scVideo && window.scVideo(); true;')
    setCamOff(c => !c)
  }
  const flipCamera = () => {
    webViewRef.current?.injectJavaScript('window.scFlipCamera && window.scFlipCamera(); true;')
  }
  const hideLocal = () => {
    webViewRef.current?.injectJavaScript('window.scHideLocal && window.scHideLocal(); true;')
    setPipHidden(h => !h)
  }


  const addMessage = (text: string, fromMe: boolean, remoteId?: string) => {
    const mid = remoteId || String(++msgIdRef.current)
    setMessages(prev => [...prev.slice(-20), { id: mid, text, fromMe }])
    if (!fromMe) setShowChat(true) // auto-show only on incoming message
  }

  const sendMessage = async () => {
    const text = chatInput.trim()
    if (!text || !callId || !userId) return
    setChatInput('')
    addMessage(text, true)
    await supabase.from('messages').insert({
      call_id: callId,
      sender_id: userId,
      receiver_id: host?.id || id,
      content: text,
    })
  }

  const sendGift = async (gift: typeof GIFTS[0]) => {
    if (credits < gift.cost) return
    setCredits(c => c - gift.cost)
    setFlyingGift(gift)
    setGiftOpen(false)
    addMessage(JSON.stringify({ type: 'gift', id: gift.id, name: gift.name, cost: gift.cost }), true)
    setTimeout(() => setFlyingGift(null), 2200)
    if (!userId) return
    await Promise.all([
      supabase.from('gifts').insert({ sender_id: userId, receiver_id: id, gift_type: gift.id, cost_sparks: gift.cost }),
      supabase.rpc('add_sparks', { user_id: userId, amount: -gift.cost }),
      supabase.from('messages').insert({ sender_id: userId, receiver_id: id as string, call_id: callId, content: JSON.stringify({ type: 'gift', id: gift.id, name: gift.name, cost: gift.cost }) }),
    ])
  }

  const endCall = async () => {
    if (ending || !callReady) return
    setEnding(true)
    clearInterval(timerRef.current)
    channelRef.current?.unsubscribe()
    const spent = sparksSpent()
    try {
      await fetch(`${API}/api/calls/end`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, durationSeconds: seconds, sparksSpent: spent, callerId: userId }),
      })
    } catch (e) {}
    if (!navigating.current) {
      navigating.current = true
      router.replace({ pathname: '/(main)/review/[id]', params: { id: id as string, duration: seconds, cost: spent, isHost: isHost || 'false', callId: callId || '' } })
    }
  }

  // ── CALLING PHASE ──
  if (phase === 'calling') return (
    <View style={[s.root, s.callingBg]}>
      <View style={[s.callingInner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Text style={s.callingLabel}>Calling…</Text>
        <Animated.View style={[s.callingAvatar, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={s.callingAvatarTxt}>{host?.name?.charAt(0) || '?'}</Text>
        </Animated.View>
        <Text style={s.callingName}>{host?.name}</Text>
        <Text style={s.callingCity}>{host?.city}</Text>
        <Text style={s.callingWait}>Waiting · {30 - waitSecs}s</Text>
        <View style={s.rateTag}>
          <Text style={s.rateTagTxt}>⚡ {rate}/min · {credits} balance</Text>
        </View>
        <TouchableOpacity style={s.cancelBtn} onPress={cancelCall}>
          <PhoneOff size={28} color="#fff"/>
        </TouchableOpacity>
        <Text style={s.cancelLabel}>Cancel</Text>
      </View>
    </View>
  )

  // ── REJECTED / TIMEOUT ──
  if (phase === 'rejected' || phase === 'timeout') return (
    <View style={[s.root, s.callingBg]}>
      <View style={[s.callingInner, { paddingTop: insets.top + 60 }]}>
        <View style={s.callingAvatar}>
          <Text style={s.callingAvatarTxt}>{host?.name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={s.callingName}>{host?.name}</Text>
        <Text style={{ color: '#FF4455', fontSize: 16, marginTop: 16, fontFamily: 'Outfit_500Medium' }}>
          {phase === 'rejected' ? 'Call declined' : 'No answer'}
        </Text>
      </View>
    </View>
  )

  // ── ACTIVE CALL ──
  const webUrl = roomUrl
    ? `${API}/api/room?room=${encodeURIComponent(roomUrl)}`
    : ''

  return (
    <View style={s.root}>

      {/* Full-screen WebView — no wrapper so HTML touch events work */}
      {webUrl ? (
        <WebView
          ref={webViewRef}
          source={{ uri: webUrl }}
          style={StyleSheet.absoluteFillObject}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          mixedContentMode="always"
          mediaCapturePermissionGrantType="grant"
          onPermissionRequest={(request) => { request.grant(request.resources) }}
          onMessage={(e) => {
            const msg = e.nativeEvent.data
            if (msg === 'showControls') {
              const newVal = !showChat
              setShowChat(newVal)
              if (newVal) showControls()
              else { Animated.timing(controlsFade, { toValue: 0, duration: 300, useNativeDriver: false }).start(); setControlsVisible(false) }
              if (giftOpen) setGiftOpen(false)
            }
          }}
        />
      ) : null}

      {/* Low credits warning */}
      {lowCredits && (
        <View style={s.lowCreditsBar} pointerEvents="none">
          <Text style={s.lowCreditsTxt}>? Low credits   call will end soon</Text>
        </View>
      )}

      {/* Flying gift */}
      {flyingGift && (
        <View style={s.flyingGift} pointerEvents="none">
          <GiftIcon id={flyingGift.id} size={80}/>
        </View>
      )}

      {/* Top bar */}
      <Animated.View style={[s.topBar, { paddingTop: insets.top + 8, opacity: controlsFade }]} pointerEvents="none">
        <View style={s.hostPill}>
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
        <View style={s.timerPill}>
          <Text style={s.timerVal}>{fmt(seconds)}</Text>
          <Text style={s.timerSparks}>⚡{sparksSpent()}</Text>
        </View>
      </Animated.View>

      {/* Chat panel — slides up above controls on tap */}
      {showChat && (
        <View style={[s.chatPanel, { bottom: 130 + insets.bottom }]}>
          <ScrollView
            ref={chatScrollRef}
            style={{ flex:1 }}
            contentContainerStyle={{ padding:12, gap:8 }}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated:true })}
            showsVerticalScrollIndicator={false}>
            {messages.map(msg => (
              <View key={msg.id} style={[s.msgRow]}>
                <View style={[s.msgAv, msg.fromMe && s.msgAvMe]}><Text style={s.msgAvTxt}>{msg.fromMe ? 'M' : host?.name?.charAt(0)}</Text></View>
                <View style={[s.msgBubble, msg.fromMe && s.msgBubbleMe]}>{(() => { try { const g = JSON.parse(msg.text); if (g.type === 'gift') return <View style={{alignItems:'center',gap:2}}><GiftIcon id={g.id} size={36}/><Text style={[s.msgTxt,{fontSize:10,color:C.gold}]}>?{g.cost}</Text></View> } catch(e){} return <Text style={s.msgTxt}>{msg.text}</Text> })()}</View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom controls */}
      <Animated.View
        style={[s.bottomArea, { paddingBottom: insets.bottom + 8, opacity: controlsFade }]}
        pointerEvents={controlsVisible ? 'auto' : 'none'}>

        {/* Chat input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            placeholder={`Message ${host?.name?.split(' ')[0] || ''}…`}
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <TouchableOpacity style={[s.sendBtn, !chatInput.trim() && s.sendOff]}
            onPress={sendMessage} disabled={!chatInput.trim()}>
            <Send size={15} color="#fff"/>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={s.controlRow}>
          <Text style={s.balance}>⚡{credits.toLocaleString()}</Text>
          <View style={s.pill}>
            {/* Mic */}
            <TouchableOpacity style={[s.ctl, muted && s.ctlOn]} onPress={toggleMic}>
              {muted ? <MicOff size={18} color="#fff"/> : <Mic size={18} color="rgba(255,255,255,0.8)"/>}
            </TouchableOpacity>
            {/* Camera */}
            <TouchableOpacity style={[s.ctl, camOff && s.ctlOn]} onPress={toggleCam}>
              {camOff ? <VideoOff size={18} color="#fff"/> : <Video size={18} color="rgba(255,255,255,0.8)"/>}
            </TouchableOpacity>
            {/* Flip camera */}
            <TouchableOpacity style={s.ctl} onPress={flipCamera}>
              <FlipHorizontal size={18} color="rgba(255,255,255,0.8)"/>
            </TouchableOpacity>
            {/* Hide/show self-view */}
            <TouchableOpacity style={s.ctl} onPress={hideLocal}>
              {pipHidden
                ? <Eye size={18} color="rgba(255,255,255,0.8)"/>
                : <EyeOff size={18} color="rgba(255,255,255,0.8)"/>}
            </TouchableOpacity>
            <View style={s.div}/>
            {/* Gift */}
            <TouchableOpacity style={[s.ctl, giftOpen && s.ctlGold]} onPress={() => setGiftOpen(v => !v)}>
              <Gift size={18} color={giftOpen ? C.gold : 'rgba(201,164,106,0.8)'}/>
            </TouchableOpacity>
            <View style={s.div}/>
            {/* End call */}
            <TouchableOpacity style={s.endBtn} onPress={endCall} disabled={ending || !callReady}>
              <PhoneOff size={20} color="#fff"/>
            </TouchableOpacity>
          </View>
          <View style={{ width: 70 }}/>
        </View>
      </Animated.View>


      {/* Gift panel */}
      {giftOpen && (
        <View style={[s.giftPanel, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.giftHeader}>
            <View>
              <Text style={s.giftTitle}>Send a Gift</Text>
              <Text style={s.giftBal}>⚡ <Text style={{ color: C.gold }}>{credits.toLocaleString()}</Text></Text>
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
                      <TouchableOpacity key={g.id} onPress={() => can && sendGift(g)}
                        style={[s.giftItem, !can && { opacity: 0.3 }]}>
                        <GiftIcon id={g.id} size={32}/>
                        <Text style={s.giftName} numberOfLines={1}>{g.name}</Text>
                        <Text style={s.giftCost}>⚡{g.cost >= 1000 ? `${g.cost / 1000}K` : g.cost}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#000' },
  callingBg:        { backgroundColor: C.bg },
  callingInner:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  callingLabel:     { color: C.muted, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Outfit_500Medium' },
  callingAvatar:    { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(214,63,110,0.15)',
                      borderWidth: 2, borderColor: 'rgba(214,63,110,0.5)', alignItems: 'center', justifyContent: 'center',
                      shadowColor: C.rose, shadowOpacity: 0.6, shadowRadius: 30, elevation: 10 },
  callingAvatarTxt: { fontSize: 44, color: C.rose, fontFamily: 'Outfit_700Bold' },
  callingName:      { fontSize: 28, color: C.white, fontFamily: 'Outfit_700Bold' },
  callingCity:      { fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular' },
  callingWait:      { fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular' },
  lowCreditsBar:  { position:'absolute', top:'45%', left:20, right:20,
                    backgroundColor:'rgba(214,63,110,0.85)', borderRadius:12,
                    padding:10, alignItems:'center', zIndex:30 },
  lowCreditsTxt:  { color:'#fff', fontFamily:'Outfit_700Bold', fontSize:13 },
  rateTag:          { backgroundColor: 'rgba(201,164,106,0.1)', borderRadius: 99,
                      paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(201,164,106,0.2)' },
  rateTagTxt:       { color: C.gold, fontSize: 13, fontFamily: 'Outfit_500Medium' },
  cancelBtn:        { width: 72, height: 72, borderRadius: 36, backgroundColor: C.rose,
                      alignItems: 'center', justifyContent: 'center', marginTop: 16,
                      shadowColor: C.rose, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 },
  cancelLabel:      { color: C.muted, fontSize: 12 },
  topBar:           { position: 'absolute', top: 0, left: 0, right: 0,
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.5)' },
  hostPill:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hostAv:           { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(214,63,110,0.6)',
                      alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  hostAvTxt:        { fontSize: 13, color: '#fff', fontFamily: 'Outfit_700Bold' },
  hostName:         { color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold' },
  liveRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  liveDot:          { width: 5, height: 5, borderRadius: 3, backgroundColor: C.success },
  liveTxt:          { color: 'rgba(255,255,255,0.55)', fontSize: 10 },
  timerPill:        { alignItems: 'flex-end' },
  timerVal:         { color: '#fff', fontSize: 20, fontFamily: 'monospace', fontWeight: '700' },
  timerSparks:      { color: C.gold, fontSize: 10, marginTop: 1 },
  flyingGift:       { position: 'absolute', top: '25%', alignSelf: 'center', zIndex: 50 },
  chatPanel:        { position: 'absolute', left: 0, right: 0, maxHeight: 200,
                      backgroundColor: 'transparent' },
  msgRow:           { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgRowMe:         { flexDirection: 'row-reverse' },
  msgAv:            { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(214,63,110,0.7)',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvMe:          { backgroundColor: 'rgba(201,164,106,0.7)' },
  msgAvLabel:       { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 2, fontFamily: 'Outfit_500Medium' },
  msgAvTxt:         { fontSize: 8, color: '#fff', fontFamily: 'Outfit_700Bold' },
  msgBubble:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderBottomLeftRadius: 4,
                      maxWidth: '85%', backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  msgBubbleMe:      { borderBottomLeftRadius: 18, borderBottomRightRadius: 4,
                      backgroundColor: 'rgba(214,63,110,0.25)', borderColor: 'rgba(214,63,110,0.3)' },
  msgTxt:           { color: '#fff', fontSize: 13, fontFamily: 'Outfit_400Regular' },
  bottomArea:       { position: 'absolute', bottom: 0, left: 0, right: 0,
                      backgroundColor: 'rgba(0,0,0,0.75)', paddingTop: 12, paddingHorizontal: 12, gap: 10 },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input:            { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)', borderRadius: 24,
                      paddingHorizontal: 16, paddingVertical: 10, color: '#fff',
                      fontFamily: 'Outfit_400Regular', fontSize: 13 },
  sendBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center' },
  sendOff:          { backgroundColor: 'rgba(255,255,255,0.1)' },
  controlRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  balance:          { color: 'rgba(255,255,255,0.5)', fontSize: 11, width: 70, fontFamily: 'Outfit_400Regular' },
  pill:             { flexDirection: 'row', alignItems: 'center', gap: 2,
                      backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.12)', borderRadius: 99,
                      paddingHorizontal: 10, paddingVertical: 6 },
  ctl:              { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ctlOn:            { backgroundColor: 'rgba(255,255,255,0.2)' },
  ctlGold:          { backgroundColor: 'rgba(201,164,106,0.2)' },
  div:              { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 2 },
  endBtn:           { width: 48, height: 48, borderRadius: 24, backgroundColor: C.rose,
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: C.rose, shadowOpacity: 0.5, shadowRadius: 12 },
  giftPanel:        { position: 'absolute', bottom: 0, left: 0, right: 0,
                      backgroundColor: 'rgba(8,5,18,0.97)', borderTopWidth: 1,
                      borderTopColor: 'rgba(201,164,106,0.2)', padding: 18, maxHeight: '75%' },
  giftHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  giftTitle:        { fontSize: 20, color: '#fff', fontFamily: 'Outfit_700Bold' },
  giftBal:          { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  closeBtn:         { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  tierLabel:        { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  giftGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  giftItem:         { width: '14%', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 2 },
  giftName:         { fontSize: 7, color: '#fff', textAlign: 'center', fontFamily: 'Outfit_500Medium' },
  giftCost:         { fontSize: 8, color: C.gold, fontFamily: 'Outfit_700Bold' },

  pipHiddenOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
                      alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
})





















