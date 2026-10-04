import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { VideoView, useVideoPlayer } from 'expo-video'
import { C } from '../../lib/theme'

function PreviewVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; p.play() })
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
}

export default function CameraPreviewScreen() {
  const { uri, type, chatId } = useLocalSearchParams<{ uri: string; type: 'image' | 'video'; chatId: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [focused, setFocused] = useState(false)
  const [done, setDone] = useState(false)

  useFocusEffect(useCallback(() => {
    setFocused(true)
    return () => setFocused(false)
  }, []))

  useEffect(() => { setDone(false) }, [uri])

  const retake = () => {
    setDone(true)
    router.replace({ pathname: '/(main)/camera', params: { chatId } })
  }

  const send = () => {
    setDone(true)
    router.replace({ pathname: '/(main)/chat/[id]', params: { id: chatId, capturedUri: uri, capturedType: type } })
  }

  return (
    <View style={s.root}>
      {type === 'video' ? (
        focused && !done ? <PreviewVideo uri={uri} /> : null
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      )}

      <TouchableOpacity style={[s.closeBtn, { top: insets.top + 12 }]} onPress={retake}>
        <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
      </TouchableOpacity>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={s.retakeBtn} onPress={retake}>
          <Text style={s.retakeTxt}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.sendBtn} onPress={send}>
          <Text style={s.sendTxt}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#000' },
  closeBtn:   { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  bottomBar:  { position: 'absolute', bottom: 0, left: 0, right: 0,
                flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, gap: 12 },
  retakeBtn:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  retakeTxt:  { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 15 },
  sendBtn:    { flex: 1, backgroundColor: C.rose, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  sendTxt:    { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 15 },
})