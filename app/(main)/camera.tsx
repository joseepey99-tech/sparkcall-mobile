import { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RotateCcw } from 'lucide-react-native'
import { C } from '../../lib/theme'

const { width: SW } = Dimensions.get('window')

import { useLocalSearchParams } from 'expo-router'

export default function CameraScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [camPerm, requestCamPerm] = useCameraPermissions()
  const [micPerm, requestMicPerm] = useMicrophonePermissions()
  const [mode, setMode] = useState<'picture' | 'video'>('picture')
  const [facing, setFacing] = useState<'back' | 'front'>('front')
  const [recording, setRecording] = useState(false)
  const camRef = useRef<CameraView>(null)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!recording) { setSeconds(0); return }
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  if (!camPerm || !micPerm) return <View style={s.root} />

  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={[s.root, s.permWrap]}>
        <Text style={s.permTxt}>Camera and microphone access needed</Text>
        <TouchableOpacity style={s.permBtn} onPress={async () => { await requestCamPerm(); await requestMicPerm() }}>
          <Text style={s.permBtnTxt}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const takePicture = async () => {
    if (!camRef.current) return
    const photo = await camRef.current.takePictureAsync({ quality: 0.7 })
    if (photo) router.replace({ pathname: '/(main)/camera-preview', params: { uri: photo.uri, type: 'image', chatId } })
  }

  const toggleRecording = async () => {
    if (!camRef.current) return
    if (recording) {
      camRef.current.stopRecording()
      return
    }
    setRecording(true)
    const video = await camRef.current.recordAsync({ maxDuration: 60 })
    setRecording(false)
     if (video) router.replace({ pathname: '/(main)/camera-preview', params: { uri: video.uri, type: 'video', chatId } })
  }

  const handleShutter = () => {
    if (mode === 'picture') takePicture()
    else toggleRecording()
  }

  return (
    <View style={s.root}>
      <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing={facing} mode={mode} />

            {recording && (
        <View style={[s.timerPill, { top: insets.top + 18 }]}>
          <View style={s.timerDot} />
          <Text style={s.timerTxt}>{timerLabel}</Text>
        </View>
      )}

      <TouchableOpacity style={[s.closeBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.flipBtn, { top: insets.top + 12 }]}
        onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
        <RotateCcw size={20} color="#fff" />
      </TouchableOpacity>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.modeRow}>
          <TouchableOpacity onPress={() => setMode('picture')}>
            <Text style={[s.modeTxt, mode === 'picture' && s.modeTxtActive]}>PHOTO</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('video')}>
            <Text style={[s.modeTxt, mode === 'video' && s.modeTxtActive]}>VIDEO</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleShutter} style={s.shutterOuter}>
          <View style={[s.shutterInner, mode === 'video' && s.shutterVideo, recording && s.shutterRecording]} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#000' },
  permWrap:      { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  permTxt:       { color: '#fff', fontFamily: 'Outfit_400Regular', fontSize: 15, textAlign: 'center' },
  permBtn:       { backgroundColor: C.rose, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnTxt:    { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  timerPill:     { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
                   backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  timerDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
  timerTxt:      { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  closeBtn:      { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20,
                   backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  flipBtn:       { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20,
                   backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', gap: 20 },
  modeRow:       { flexDirection: 'row', gap: 24 },
  modeTxt:       { color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit_700Bold', fontSize: 13, letterSpacing: 1 },
  modeTxtActive: { color: '#fff' },
  shutterOuter:  { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff',
                   alignItems: 'center', justifyContent: 'center' },
  shutterInner:  { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  shutterVideo:  { backgroundColor: C.rose },
  shutterRecording: { borderRadius: 8, width: 28, height: 28 },
})