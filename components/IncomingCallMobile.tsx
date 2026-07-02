import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import { Phone, PhoneOff } from 'lucide-react-native'

const API = 'https://sparkcall.vercel.app'

export default function IncomingCallMobile() {
  const router = useRouter()
  const [call, setCall]       = useState<any>(null)
  const [caller, setCaller]   = useState<any>(null)
  const [seconds, setSeconds] = useState(30)
  const [loading, setLoading] = useState(false)
  const timerRef   = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const pulseAnim  = useRef(new Animated.Value(1)).current

  useEffect(() => {
    let userId: string | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      // Only listen if user is a host
      const { data: profile } = await supabase
        .from('profiles').select('is_host').eq('id', user.id).single()
      if (!profile?.is_host) return

      channelRef.current = supabase
        .channel(`mobile-incoming-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'calls',
          filter: `host_id=eq.${user.id}`,
        }, async (payload) => {
          if (payload.new.status !== 'pending') return
          const { data: callerProfile } = await supabase
            .from('profiles').select('*').eq('id', payload.new.caller_id).single()
          setCaller(callerProfile)
          setCall(payload.new)
          setSeconds(30)
        })
        .subscribe()
    }

    init()
    return () => { channelRef.current?.unsubscribe(); clearInterval(timerRef.current) }
  }, [])

  // Pulse animation
  useEffect(() => {
    if (!call) return
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
    ]))
    anim.start()
    return () => anim.stop()
  }, [call])

  // Countdown
  useEffect(() => {
    if (!call) return
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timerRef.current); handleReject(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [call])

  const dismiss = () => {
    setCall(null); setCaller(null); setLoading(false); setSeconds(30)
  }

  const handleAccept = async () => {
    if (!call) return
    setLoading(true)
    clearInterval(timerRef.current)
    await fetch(`${API}/api/calls/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: call.id }),
    })
    dismiss()
    // Navigate to call screen as host
    router.push({
      pathname: '/(main)/call/[id]',
      params: {
        id: call.caller_id,
        callId: call.id,
        roomUrl: call.room_url,
        isHost: 'true',
      }
    })
  }

  const handleReject = async () => {
    if (!call) return
    clearInterval(timerRef.current)
    await fetch(`${API}/api/calls/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: call.id }),
    })
    dismiss()
  }

  if (!call) return null

  return (
    <Modal transparent animationType="fade" visible={!!call}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Pulse avatar */}
          <Animated.View style={[s.avatar, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={s.avatarTxt}>{caller?.name?.charAt(0) || '?'}</Text>
          </Animated.View>

          <Text style={s.label}>Incoming Call</Text>
          <Text style={s.callerName}>{caller?.name || 'Someone'}</Text>
          <Text style={s.callerSub}>wants to connect with you</Text>

          <View style={s.rateTag}>
            <Text style={s.rateTxt}>⚡ You earn {caller?.rate || 0} sparks/min</Text>
          </View>

          <Text style={s.countdown}>Auto-declining in {seconds}s</Text>

          <View style={s.btns}>
            <TouchableOpacity style={s.rejectBtn} onPress={handleReject} disabled={loading}>
              <PhoneOff size={24} color="#fff"/>
              <Text style={s.btnTxt}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.acceptBtn} onPress={handleAccept} disabled={loading}>
              <Phone size={24} color="#fff"/>
              <Text style={s.btnTxt}>{loading ? 'Joining…' : 'Accept'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay:     { flex:1, backgroundColor:'rgba(0,0,0,0.85)',
                 alignItems:'center', justifyContent:'center' },
  card:        { backgroundColor:C.card, borderRadius:24, padding:32,
                 width:'85%', alignItems:'center', gap:12,
                 borderWidth:1, borderColor:'rgba(214,63,110,0.3)',
                 shadowColor:C.rose, shadowOpacity:0.3, shadowRadius:30, elevation:20 },
  avatar:      { width:88, height:88, borderRadius:44,
                 backgroundColor:'rgba(214,63,110,0.2)',
                 borderWidth:2, borderColor:'rgba(214,63,110,0.5)',
                 alignItems:'center', justifyContent:'center',
                 shadowColor:C.rose, shadowOpacity:0.5, shadowRadius:20 },
  avatarTxt:   { fontSize:36, color:C.rose, fontFamily:'Outfit_700Bold' },
  label:       { color:C.muted, fontSize:11, letterSpacing:3,
                 textTransform:'uppercase', fontFamily:'Outfit_500Medium' },
  callerName:  { color:C.white, fontSize:24, fontFamily:'Outfit_700Bold' },
  callerSub:   { color:C.muted, fontSize:13, fontFamily:'Outfit_400Regular' },
  rateTag:     { backgroundColor:'rgba(201,164,106,0.1)', borderRadius:99,
                 paddingHorizontal:16, paddingVertical:8,
                 borderWidth:1, borderColor:'rgba(201,164,106,0.25)' },
  rateTxt:     { color:C.gold, fontSize:13, fontFamily:'Outfit_500Medium' },
  countdown:   { color:'rgba(255,255,255,0.3)', fontSize:12 },
  btns:        { flexDirection:'row', gap:12, marginTop:8, width:'100%' },
  rejectBtn:   { flex:1, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:14,
                 padding:14, alignItems:'center', gap:6,
                 borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  acceptBtn:   { flex:1, backgroundColor:C.rose, borderRadius:14,
                 padding:14, alignItems:'center', gap:6,
                 shadowColor:C.rose, shadowOpacity:0.4, shadowRadius:12 },
  btnTxt:      { color:'#fff', fontFamily:'Outfit_700Bold', fontSize:14 },
})
