import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet,
         ScrollView, Image, Dimensions, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Play } from 'lucide-react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../../lib/supabase'
import { C } from '../../../lib/theme'
import { countryToFlag, COUNTRIES } from '../../../lib/countries'

function VideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.play() })
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
}

function VideoThumbnail({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.pause() })
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
}

export default function Profile() {
  const router  = useRouter()
  const { id }  = useLocalSearchParams<{ id: string }>()
  const [host, setHost]           = useState<any>(null)
  const insets = useSafeAreaInsets()
  const [caller, setCaller]       = useState<any>(null)
  const [reviews, setReviews]     = useState<any[]>([])
  const [videos, setVideos]       = useState<any[]>([])
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)

    useFocusEffect(useCallback(() => {
    setHost(null)
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
        const [{ data: h }, { data: c }, { data: r }, { data: v }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('reviews').select('*').eq('host_id', id)
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('profile_videos').select('*').eq('user_id', id)
          .order('created_at', { ascending: false }),
      ])
      setHost(h); setCaller(c); setReviews(r || []); setVideos(v || [])
    }
    load()
  }, [id]))

  const getRate = () => {
    if (!caller || !host) return host?.rate || 0
    const d = caller.premium === 'platinum' ? 0.8
            : caller.premium === 'gold' ? 0.9 : 1
    return Math.round((host.rate || 0) * d)
  }

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  const startCall = () => {
    router.push({
      pathname: '/(main)/call/[id]',
      params: {
        id,
        // Pass caller's credits so call screen doesn't need to re-fetch
        callerCredits: String(caller?.credits ?? 0),
        callerPremium: caller?.premium ?? '',
      },
    })
  }

    if (!host) return (
    <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: C.muted, fontFamily: 'Outfit_400Regular' }}>Loading…</Text>
    </View>
  )

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView>
                <View style={s.hero}>
          {host?.avatar_url ? (
            <Image source={{ uri: host.avatar_url }} style={s.heroPhoto} />
          ) : (
            <View style={[s.heroPhoto, s.heroPhotoFallback]}>
              <Text style={s.avatarTxt}>{host?.name?.charAt(0)}</Text>
            </View>
          )}
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <LinearGradient
            colors={['transparent', 'rgba(6,4,14,0.95)']}
            style={s.heroGradient}>
            <Text style={s.name}>{host?.name}</Text>
            <Text style={s.region}>
              {host?.country ? `${countryToFlag(host.country)} ${COUNTRIES.find(c => c.code === host.country)?.name}` : '—'}
            </Text>
          </LinearGradient>
        </View>
        <View style={s.contentBelow}>
          <View style={s.stats}>
            <View style={s.stat}>
              <Text style={s.statVal}>⭐ {avgRating}</Text>
              <Text style={s.statLabel}>Rating</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statVal}>{reviews.length}</Text>
              <Text style={s.statLabel}>Reviews</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statVal}>⚡ {getRate()}/min</Text>
              <Text style={s.statLabel}>Your rate</Text>
            </View>
          </View>

        {host?.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bio}>{host.bio}</Text>
          </View>
        )}

        {host?.language && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Language</Text>
            <Text style={s.bio}>{host.language}</Text>
                    </View>
        )}

        {videos.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Videos</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {videos.map((v, i) => (
                <TouchableOpacity key={v.id} onPress={() => setPlayingIndex(i)} style={s.videoCard}>
                  <VideoThumbnail uri={v.video_url} />
                  <View style={s.videoPlayBadge}>
                    <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                  </View>
                  <View style={s.videoDurationBadge}>
                    <Text style={s.videoDurationTxt}>{v.duration_seconds}s</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {reviews.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Reviews</Text>
            {reviews.map((r, i) => (
              <View key={i} style={s.reviewCard}>
                <Text style={s.stars}>{'⭐'.repeat(r.rating)}</Text>
                {r.comment && <Text style={s.comment}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={s.chatBtn}
          onPress={() => router.push({
            pathname: '/(main)/chat/[id]', params: { id }
          })}>
          <Text style={s.chatBtnTxt}>💬 Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.callBtn} onPress={startCall}>
          <Text style={s.callBtnTxt}>📞 Call · ⚡{getRate()}/min</Text>
                </TouchableOpacity>
      </View>

      <Modal visible={playingIndex !== null} animationType="fade" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
          {playingIndex !== null && videos[playingIndex] && (
            <VideoPlayer key={videos[playingIndex].id} uri={videos[playingIndex].video_url} />
          )}

          <TouchableOpacity
            onPress={() => setPlayingIndex(null)}
            style={{ position: 'absolute', top: 50, right: 20, width: 40, height: 40,
              borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>

          {playingIndex !== null && playingIndex > 0 && (
            <TouchableOpacity
              onPress={() => setPlayingIndex(i => (i !== null ? i - 1 : null))}
              style={{ position: 'absolute', left: 16, top: '50%', marginTop: -22,
                width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 20 }}>‹</Text>
            </TouchableOpacity>
          )}

          {playingIndex !== null && playingIndex < videos.length - 1 && (
            <TouchableOpacity
              onPress={() => setPlayingIndex(i => (i !== null ? i + 1 : null))}
              style={{ position: 'absolute', right: 16, top: '50%', marginTop: -22,
                width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  hero:         { width: '100%', aspectRatio: 0.85, position: 'relative' },
  heroPhoto:    { width: '100%', height: '100%' },
  heroPhotoFallback: { alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(214,63,110,0.2)' },
  back:         { position: 'absolute', top: 16, left: 16, zIndex: 10,
                  backgroundColor: 'rgba(6,4,14,0.6)', borderRadius: 99,
                  paddingHorizontal: 12, paddingVertical: 6 },
  backTxt:      { color: '#fff', fontFamily: 'Outfit_500Medium', fontSize: 14 },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0,
                  paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  contentBelow: { paddingTop: 16, alignItems: 'center' },
  avatarTxt:    { fontSize: 44, color: C.rose, fontFamily: 'Outfit_700Bold' },
  avatarImgFull: { width: 90, height: 90, borderRadius: 45 },
  name:         { fontSize: 24, color: C.white, fontFamily: 'Outfit_700Bold', marginTop: 6 },
  region:       { fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular' },
  stats:        { flexDirection: 'row', gap: 20, marginTop: 16 },
  stat:         { alignItems: 'center', gap: 2 },
  statVal:      { fontSize: 15, color: C.white, fontFamily: 'Outfit_700Bold' },
  statLabel:    { fontSize: 10, color: C.muted, fontFamily: 'Outfit_400Regular' },
  section:      { padding: 20, gap: 10 },
  sectionTitle: { fontSize: 13, color: C.muted, letterSpacing: 1.5,
                  textTransform: 'uppercase', fontFamily: 'Outfit_500Medium' },
  bio:          { color: C.white, fontFamily: 'Outfit_400Regular', fontSize: 15, lineHeight: 22 },
  reviewCard:   { backgroundColor: C.card, borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: C.border, gap: 4 },
  stars:        { fontSize: 14 },
  comment:      { color: C.muted, fontFamily: 'Outfit_400Regular', fontSize: 13 },
  cta:          { flexDirection: 'row', gap: 10, padding: 16,
                  borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  chatBtn:      { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
                  borderRadius: 12, padding: 14, alignItems: 'center' },
  chatBtnTxt:   { color: C.white, fontFamily: 'Outfit_700Bold', fontSize: 14 },
  callBtn:      { flex: 2, backgroundColor: C.rose, borderRadius: 12,
                  padding: 14, alignItems: 'center' },
    callBtnTxt:   { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  videoCard:        { width: 90, height: 130, borderRadius: 12, backgroundColor: C.bg,
                      borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  videoPlayBadge:   { position: 'absolute', top: '50%', left: '50%',
                      marginTop: -20, marginLeft: -20, width: 40, height: 40, borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  videoDurationBadge: { position: 'absolute', bottom: 6, left: 6,
                      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  videoDurationTxt: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_500Medium' },
})



