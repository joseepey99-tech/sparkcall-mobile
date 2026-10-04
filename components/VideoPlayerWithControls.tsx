import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, PanResponder } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Play } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../lib/theme'

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function VideoPlayerWithControls({ uri }: { uri: string }) {
  const insets = useSafeAreaInsets()
  const player = useVideoPlayer(uri, p => { p.play() })
  const [playing, setPlaying] = useState(true)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const trackW = useRef(1)
  const startX = useRef(0)
  const durRef = useRef(0)
  const scrubbing = useRef(false)
  const wasPlaying = useRef(false)

  useEffect(() => {
    const t = setInterval(() => {
      try {
        setPlaying(player.playing)
        if (!scrubbing.current) setTime(player.currentTime)
        if (player.duration && player.duration !== durRef.current) {
          durRef.current = player.duration
          setDuration(player.duration)
        }
      } catch {}
    }, 200)
    return () => clearInterval(t)
  }, [player])

  const seekTo = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / trackW.current))
    const target = ratio * durRef.current
    player.currentTime = target
    setTime(target)
  }

  const finishScrub = () => {
    scrubbing.current = false
    if (wasPlaying.current) player.play()
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => {
      scrubbing.current = true
      wasPlaying.current = player.playing
      player.pause()
      startX.current = e.nativeEvent.locationX
      seekTo(startX.current)
    },
    onPanResponderMove: (_, g) => seekTo(startX.current + g.dx),
    onPanResponderRelease: finishScrub,
    onPanResponderTerminate: finishScrub,
  })).current

  const toggle = () => {
    if (player.playing) {
      player.pause()
    } else {
      if (durRef.current && player.currentTime >= durRef.current - 0.2) player.currentTime = 0
      player.play()
    }
    setPlaying(player.playing)
  }

  const progress = duration > 0 ? Math.min(1, time / duration) : 0

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />

      <Pressable style={StyleSheet.absoluteFill} onPress={toggle}>
        {!playing && (
          <View style={s.centerWrap} pointerEvents="none">
            <View style={s.centerBtn}>
              <Play size={30} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
        )}
      </Pressable>

      <View style={[s.bar, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.time}>{fmt(time)}</Text>
        <View style={s.trackTouch}
          onLayout={e => { trackW.current = e.nativeEvent.layout.width }}
          {...pan.panHandlers}>
          <View style={s.track} pointerEvents="none">
            <View style={[s.fill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={[s.thumb, { left: `${progress * 100}%` }]} pointerEvents="none" />
        </View>
        <Text style={s.time}>{fmt(duration)}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtn:  { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.5)',
                borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  bar:        { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center',
                gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: 'rgba(0,0,0,0.35)' },
  time:       { color: '#fff', fontFamily: 'Outfit_500Medium', fontSize: 12, minWidth: 36, textAlign: 'center' },
  trackTouch: { flex: 1, height: 32, justifyContent: 'center' },
  track:      { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill:       { height: 4, backgroundColor: C.rose },
  thumb:      { position: 'absolute', top: 9, marginLeft: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
})