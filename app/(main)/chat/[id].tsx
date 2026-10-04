import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity,
         StyleSheet, KeyboardAvoidingView, Platform, Modal, ScrollView, Alert, Image, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../../lib/supabase'
import { C } from '../../../lib/theme'
import { GiftIcon, GIFTS, TIER_LABELS } from '../../../components/GiftIcons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { Paperclip, Play, ChevronLeft, Phone, Gift, Send } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { VideoView, useVideoPlayer } from 'expo-video'
import VideoPlayerWithControls from '../../../components/VideoPlayerWithControls'

const API = 'https://sparkcall.vercel.app'
function VideoThumbChat({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.pause() })
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
}

function VideoPlayerChat({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.play() })
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ChatScreen() {
  const { id, capturedUri, capturedType } = useLocalSearchParams<{ id: string; capturedUri?: string; capturedType?: 'image' | 'video' }>()
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

    const [attachMenuOpen, setAttachMenuOpen] = useState(false)

  useFocusEffect(useCallback(() => {
    if (capturedUri && capturedType) {
      const name = `${capturedType}_${Date.now()}.${capturedType === 'video' ? 'mp4' : 'jpg'}`
      const mimeType = capturedType === 'video' ? 'video/mp4' : 'image/jpeg'
      uploadAndSendAttachment(capturedUri, name, capturedType, mimeType)
      router.setParams({ capturedUri: undefined, capturedType: undefined })
    }
  }, [capturedUri, capturedType]))
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const uploadAndSendAttachment = async (uri: string, name: string, mediaType: 'image' | 'video' | 'file', mimeType: string, size?: number) => {
    setUploadingAttachment(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ext = name.split('.').pop() || 'bin'
      const path = `${user.id}/${Date.now()}.${ext}`

      if (mediaType === 'image') {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
        const arrayBuffer = decode(base64)
        const { error } = await supabase.storage.from('ChatMedia').upload(path, arrayBuffer, { contentType: mimeType })
        if (error) throw error
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/ChatMedia/${path}`
        const result = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': mimeType,
          },
        })
        if (result.status !== 200) throw new Error('Upload failed (status ' + result.status + ')')
      }

      const { data: urlData } = supabase.storage.from('ChatMedia').getPublicUrl(path)

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: id,
        content: name,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        file_name: name,
        file_size: size || null,
      })
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Something went wrong.')
    } finally {
      setUploadingAttachment(false)
    }
  }

    const pickImageOrVideo = async (source: 'camera' | 'library') => {
    setAttachMenuOpen(false)
    let result
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) { Alert.alert('Permission needed', 'Please allow camera access.'); return }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 })
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 })
    }
    if (result.canceled) return
    const asset = result.assets[0]
    const mediaType = asset.type === 'video' ? 'video' : 'image'
    const name = asset.uri.split('/').pop() || `${mediaType}.${mediaType === 'video' ? 'mp4' : 'jpg'}`
    const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg'
    uploadAndSendAttachment(asset.uri, name, mediaType, mimeType)
  }

  const pickDocument = async () => {
    setAttachMenuOpen(false)
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
    if (result.canceled) return
    const asset = result.assets[0]
    uploadAndSendAttachment(asset.uri, asset.name, 'file', asset.mimeType || 'application/octet-stream', asset.size)
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

  const isSameDay = (a: string, b: string) => {
    const x = new Date(a), y = new Date(b)
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  }

  const dayLabel = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    if (isSameDay(ts, now.toISOString())) return 'Today'
    const yest = new Date(); yest.setDate(now.getDate() - 1)
    if (isSameDay(ts, yest.toISOString())) return 'Yesterday'
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const yr = d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + yr
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

  const renderBubble = ({ item, index }: any) => {
    const fromMe = item.sender_id === me?.id
    const gift   = parseGift(item.content)
    const nextMsg = messages[index + 1]
    const GROUP_MS = 5 * 60 * 1000
    const sameAsNext = !!nextMsg && nextMsg.sender_id === item.sender_id && (new Date(nextMsg.created_at).getTime() - new Date(item.created_at).getTime()) < GROUP_MS
    const isMedia = item.media_type === 'image' || item.media_type === 'video'
    return (
      <View style={[s.msgRow, fromMe && s.msgRowMe, { marginBottom: sameAsNext ? 2 : 10 }]}>
            <View style={[s.bubble, fromMe ? s.bubbleMe : s.bubbleThem,
          gift && s.giftBubble, gift && s.giftNoBg, isMedia && s.imageBubble,
          sameAsNext && (fromMe ? s.noTailMe : s.noTailThem)]}>
            {fromMe && !gift && !isMedia && (
              <LinearGradient colors={[C.rose, '#B8305F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            )}
            {gift ? (
            <View style={s.giftMsgInner}>
              <GiftIcon id={gift.id} size={48}/>
              <Text style={s.giftMsgName}>{gift.name}</Text>
              <Text style={s.giftMsgCost}>⚡{gift.cost}</Text>
            </View>
           ) : item.media_type === 'image' ? (
            <TouchableOpacity onPress={() => setViewingImage(item.media_url)}>
              <Image source={{ uri: item.media_url }} style={s.attachImg} />
            </TouchableOpacity>
                    ) : item.media_type === 'video' ? (
            <TouchableOpacity onPress={() => setPlayingVideo(item.media_url)} style={s.attachVideo}>
              <VideoThumbChat uri={item.media_url} />
              <View style={s.attachVideoPlayBadge}>
                <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
              </View>
            </TouchableOpacity>
          ) : item.media_type === 'file' ? (
            <View style={s.attachFile}>
              <View style={s.attachFileIcon}>
                <Text style={{ fontSize: 20 }}>📄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.attachFileName} numberOfLines={1}>{item.file_name}</Text>
                {item.file_size && (
                  <Text style={s.attachFileSize}>{formatFileSize(item.file_size)}</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={s.bubbleTxt}>{item.content}</Text>
          )}
          <Text style={[s.bubbleTime, isMedia && s.mediaTime]}>{fmtTime(item.created_at)}</Text>
        </View>
      </View>
    )
  }

  const hostOnline = !!host?.last_seen && (Date.now() - new Date(host.last_seen).getTime()) < 45000
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={C.white} />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerCenter} activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/(main)/profile/[id]', params: { id } })}>
          <View style={s.headerAvatar}>
            {host?.avatar_url ? (
              <Image source={{ uri: host.avatar_url }} style={s.headerAvatarImg} />
            ) : (
              <Text style={s.headerAvatarTxt}>{host?.name?.charAt(0) || '?'}</Text>
            )}
            {hostOnline && <View style={s.onlineDot} />}
          </View>
          <View>
            <Text style={s.headerName} numberOfLines={1}>{host?.name}</Text>
            <Text style={[s.headerSub, hostOnline && { color: '#3DD68C' }]}>{hostOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={s.callBtn}
          onPress={() => router.push({ pathname: '/(main)/call/[id]', params: {
            id, callerCredits: String(me?.credits ?? 0), callerPremium: me?.premium ?? ''
          }})}>
          <Phone size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item, index }: any) => (
          <View>
            {(index === 0 || !isSameDay(messages[index - 1].created_at, item.created_at)) && (
              <View style={s.daySep}><Text style={s.daySepTxt}>{dayLabel(item.created_at)}</Text></View>
            )}
            {renderBubble({ item, index })}
          </View>
        )}
        contentContainerStyle={s.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Input bar */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={s.inputWrap}>
          <TouchableOpacity style={s.inputIconBtn} onPress={() => setAttachMenuOpen(true)} disabled={uploadingAttachment}>
            {uploadingAttachment ? <ActivityIndicator size="small" color={C.muted} /> : <Paperclip size={20} color={C.muted} />}
          </TouchableOpacity>
        <TextInput
          style={s.inputField}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          placeholder="Message…"
          placeholderTextColor={C.muted}
          multiline
        />
          <TouchableOpacity style={s.inputIconBtn} onPress={() => setGiftOpen(true)}>
            <Gift size={20} color={C.gold} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && s.sendBtnOff]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim()}>
          <Send size={18} color={input.trim() ? '#fff' : C.muted} />
        </TouchableOpacity>
      </View>

            {/* Attachment Menu */}
      <Modal visible={attachMenuOpen} transparent animationType="slide"
        onRequestClose={() => setAttachMenuOpen(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setAttachMenuOpen(false)}>
          <View style={[s.giftPanel, { paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}>
            <View style={s.giftHeader}>
              <Text style={s.giftTitle}>Attach</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setAttachMenuOpen(false)}>
                <Text style={{ color: C.muted, fontSize: 22 }}>×</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setAttachMenuOpen(false); router.push({ pathname: '/(main)/camera', params: { chatId: id } }) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              <Text style={{ fontSize: 22 }}>📷</Text>
              <Text style={{ color: C.white, fontFamily: 'Outfit_500Medium', fontSize: 15 }}>Take Photo or Video</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickImageOrVideo('library')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              <Text style={{ fontSize: 22 }}>🖼️</Text>
              <Text style={{ color: C.white, fontFamily: 'Outfit_500Medium', fontSize: 15 }}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickDocument}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              <Text style={{ fontSize: 22 }}>📄</Text>
              <Text style={{ color: C.white, fontFamily: 'Outfit_500Medium', fontSize: 15 }}>Document</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
      {/* Full-screen video player */}
      <Modal visible={!!playingVideo} transparent animationType="fade"
        onRequestClose={() => setPlayingVideo(null)}>
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
         {playingVideo && <VideoPlayerWithControls uri={playingVideo} />}
          <TouchableOpacity
            onPress={() => setPlayingVideo(null)}
            style={{ position: 'absolute', top: 50, right: 20, width: 40, height: 40,
              borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

          {/* Full-screen image viewer */}
      <Modal visible={!!viewingImage} transparent animationType="fade"
        onRequestClose={() => setViewingImage(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1} onPress={() => setViewingImage(null)}>
          {viewingImage && (
            <Image source={{ uri: viewingImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          )}
          <TouchableOpacity
            onPress={() => setViewingImage(null)}
            style={{ position: 'absolute', top: 50, right: 20, width: 40, height: 40,
              borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
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
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  backTxt:      { color: C.rose, fontFamily: 'Outfit_500Medium', fontSize: 14 },
  headerName:   { color: C.white, fontFamily: 'Outfit_700Bold', fontSize: 16 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(214,63,110,0.2)', borderWidth: 1, borderColor: 'rgba(214,63,110,0.4)', alignItems: 'center', justifyContent: 'center' },
  headerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarTxt: { color: C.rose, fontFamily: 'Outfit_700Bold', fontSize: 15 },
  onlineDot:    { position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#3DD68C', borderWidth: 2, borderColor: C.bg },
  headerSub:    { color: C.muted, fontFamily: 'Outfit_400Regular', fontSize: 11, marginTop: 1 },
  callBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center' },
  callPill:     { backgroundColor: C.rose, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  callPillTxt:  { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 13 },
  listContent:  { padding: 16, gap: 0 },
  daySep:       { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, marginVertical: 12 },
  daySepTxt:    { color: C.muted, fontFamily: 'Outfit_500Medium', fontSize: 11 },
  msgRow:       { flexDirection: 'row', marginBottom: 8 },
  msgRowMe:     { justifyContent: 'flex-end' },
  bubble:       { maxWidth: '78%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  bubbleMe:     { backgroundColor: C.rose, borderBottomRightRadius: 4, overflow: 'hidden' },
  bubbleThem:   { backgroundColor: C.card, borderBottomLeftRadius: 4,
                  borderWidth: 1, borderColor: C.border },
  bubbleTxt:    { color: C.white, fontFamily: 'Outfit_400Regular', fontSize: 14 },
  attachImg:    { width: 180, height: 180, borderRadius: 18, resizeMode: 'cover' },
  imageBubble:  { width: 180, height: 180, padding: 0, overflow: 'hidden', backgroundColor: 'transparent', borderWidth: 0 },
  attachVideo:  { width: '100%', height: '100%', position: 'relative' },
  attachVideoPlayBadge: { position: 'absolute', top: '50%', left: '50%',
                      marginTop: -20, marginLeft: -20, width: 40, height: 40, borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
                      alignItems: 'center', justifyContent: 'center' },
  attachFile:   { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  attachFileIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)',
                    alignItems: 'center', justifyContent: 'center' },
  attachFileName: { color: C.white, fontFamily: 'Outfit_700Bold', fontSize: 13 },
  attachFileSize: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit_400Regular', fontSize: 11, marginTop: 2 },
  bubbleTime:   { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2, textAlign: 'right' },
  mediaTime:    { position: 'absolute', right: 8, bottom: 8, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  noTailMe:     { borderBottomRightRadius: 16 },
  noTailThem:   { borderBottomLeftRadius: 16 },
  giftBubble:   { alignItems: 'center', paddingVertical: 14 },
  giftNoBg:     { backgroundColor: 'transparent', borderWidth: 0 },
  giftMsgInner: { alignItems: 'center', gap: 4 },
  giftMsgName:  { color: C.white, fontFamily: 'Outfit_700Bold', fontSize: 13, marginTop: 4 },
  giftMsgCost:  { color: C.gold, fontFamily: 'Outfit_700Bold', fontSize: 12 },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8,
                  paddingHorizontal: 12, paddingTop: 10,
                  borderTopWidth: 1, borderTopColor: C.border,
                  backgroundColor: C.card },
  giftBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputWrap:    { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border, borderRadius: 22, paddingHorizontal: 4, minHeight: 44 },
  inputIconBtn: { width: 36, height: 42, alignItems: 'center', justifyContent: 'center' },
  inputField:   { flex: 1, paddingVertical: 11, paddingHorizontal: 4, color: C.white, fontFamily: 'Outfit_400Regular', fontSize: 14, maxHeight: 110 },
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
