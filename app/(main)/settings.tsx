import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Switch, Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

const API = 'https://sparkcall.vercel.app'

export default function Settings() {
  const [profile, setProfile]       = useState<any>(null)
  const [notifications, setNotifications] = useState(true)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    })
  }, [])
    const [uploading, setUploading] = useState(false)

  const pickAndUploadAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return }

        const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    })
    if (result.canceled) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const asset = result.assets[0]
      const ext = asset.uri.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`

            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
      const arrayBuffer = decode(base64)

      const { error: uploadError } = await supabase.storage
        .from('Avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: `image/${ext}` })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('Avatars').getPublicUrl(path)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
      if (updateError) throw updateError

      setProfile((p: any) => ({ ...p, avatar_url: avatarUrl }))
        } catch (err: any) {
      console.log('AVATAR UPLOAD ERROR:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
      Alert.alert('Upload failed', err.message || 'Something went wrong.')
    } finally {
      setUploading(false)
    }
  }
  const signOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', onPress: async () => await supabase.auth.signOut() },
    ])
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all credits, call history and personal data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: deleteAccount },
      ]
    )
  }

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/account/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      await supabase.auth.signOut()
    } catch {
      setDeleting(false)
      Alert.alert('Error', 'Could not delete account. Please try again or contact support.')
    }
  }

  const role = profile?.role === 'host' ? 'Host' : 'Caller'
  const premium = profile?.premium
    ? profile.premium.charAt(0).toUpperCase() + profile.premium.slice(1)
    : null

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Settings</Text>

        {/* Profile card */}
        <View style={s.profileCard}>
                    <TouchableOpacity style={s.avatar} onPress={pickAndUploadAvatar} disabled={uploading}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarTxt}>{profile?.name?.charAt(0)}</Text>
            )}
            <View style={s.avatarEditBadge}>
              <Text style={s.avatarEditTxt}>{uploading ? '…' : '✎'}</Text>
            </View>
          </TouchableOpacity>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{profile?.name}</Text>
            <Text style={s.profileEmail}>{profile?.email}</Text>
            <View style={s.badgeRow}>
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{role}</Text>
              </View>
              {premium && (
                <View style={[s.badge, s.badgePremium]}>
                  <Text style={[s.badgeTxt, { color: C.gold }]}>✦ {premium}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Balance */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Balance</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Spark Credits</Text>
            <Text style={s.rowValue}>⚡ {profile?.credits?.toLocaleString() || 0}</Text>
          </View>
          {profile?.role === 'host' && (
            <View style={s.row}>
              <Text style={s.rowLabel}>Total Earned</Text>
              <Text style={s.rowValue}>⚡ {profile?.total_earned?.toLocaleString() || 0}</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.rowLabel}>Call Rate</Text>
            <Text style={s.rowValue}>
              {profile?.role === 'host' ? `⚡ ${profile?.rate}/min earned` : `⚡ ${profile?.rate || '—'}/min`}
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Preferences</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Push Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: C.border, true: 'rgba(214,63,110,0.5)' }}
              thumbColor={notifications ? C.rose : C.muted}
            />
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Region</Text>
            <Text style={s.rowValue}>{profile?.region || '—'}</Text>
          </View>
        </View>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <TouchableOpacity style={s.actionRow} onPress={signOut}>
            <Text style={s.actionTxt}>Sign out</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={[s.section, s.dangerSection]}>
          <Text style={[s.sectionTitle, { color: '#FF4455' }]}>Danger Zone</Text>
          <Text style={s.dangerDesc}>
            Deleting your account is permanent. All your credits, call history, 
            and personal data will be erased immediately.
          </Text>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={confirmDelete}
            disabled={deleting}
          >
            <Text style={s.deleteBtnTxt}>
              {deleting ? 'Deleting account…' : 'Delete my account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={s.footer}>SparkCall v1.0.0 · support@sparkcall.com</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  inner:         { padding: 20, paddingBottom: 40 },
  title:         { fontSize: 28, color: C.white, fontFamily: 'Outfit_700Bold',
                   marginTop: 12, marginBottom: 24 },
  profileCard:   { flexDirection: 'row', alignItems: 'center', gap: 14,
                   backgroundColor: C.card, borderRadius: 18, padding: 18,
                   borderWidth: 1, borderColor: C.border, marginBottom: 24 },
  avatar:        { width: 60, height: 60, borderRadius: 30,
                   backgroundColor: 'rgba(214,63,110,0.2)',
                   borderWidth: 1.5, borderColor: 'rgba(214,63,110,0.4)',
                   alignItems: 'center', justifyContent: 'center' },
    avatarTxt:     { fontSize: 22, color: C.rose, fontFamily: 'Outfit_700Bold' },
  avatarImg:     { width: 60, height: 60, borderRadius: 30 },
  avatarEditBadge: { position: 'absolute', bottom: -2, right: -2,
                     width: 22, height: 22, borderRadius: 11,
                     backgroundColor: C.rose, borderWidth: 2, borderColor: C.bg,
                     alignItems: 'center', justifyContent: 'center' },
  avatarEditTxt: { color: '#fff', fontSize: 11, fontFamily: 'Outfit_700Bold' },
  profileInfo:   { flex: 1, gap: 3 },
  profileName:   { fontSize: 17, color: C.white, fontFamily: 'Outfit_700Bold' },
  profileEmail:  { fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular' },
  badgeRow:      { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge:         { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99,
                   paddingHorizontal: 10, paddingVertical: 3,
                   borderWidth: 1, borderColor: C.border },
  badgePremium:  { borderColor: 'rgba(201,164,106,0.4)',
                   backgroundColor: 'rgba(201,164,106,0.1)' },
  badgeTxt:      { fontSize: 11, color: C.muted, fontFamily: 'Outfit_500Medium' },
  section:       { marginBottom: 24 },
  sectionTitle:  { fontSize: 11, color: C.muted, fontFamily: 'Outfit_600SemiBold',
                   letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  row:           { flexDirection: 'row', justifyContent: 'space-between',
                   alignItems: 'center', paddingVertical: 13,
                   borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel:      { color: C.white, fontFamily: 'Outfit_400Regular', fontSize: 14 },
  rowValue:      { color: C.muted, fontFamily: 'Outfit_500Medium', fontSize: 13 },
  actionRow:     { flexDirection: 'row', justifyContent: 'space-between',
                   alignItems: 'center', paddingVertical: 15,
                   borderBottomWidth: 1, borderBottomColor: C.border },
  actionTxt:     { color: C.white, fontFamily: 'Outfit_400Regular', fontSize: 14 },
  chevron:       { color: C.muted, fontSize: 20 },
  dangerSection: { backgroundColor: 'rgba(255,68,85,0.05)', borderRadius: 16,
                   padding: 16, borderWidth: 1, borderColor: 'rgba(255,68,85,0.2)' },
  dangerDesc:    { color: C.muted, fontFamily: 'Outfit_400Regular',
                   fontSize: 13, lineHeight: 20, marginBottom: 16 },
  deleteBtn:     { backgroundColor: 'rgba(255,68,85,0.15)', borderRadius: 12,
                   padding: 14, alignItems: 'center',
                   borderWidth: 1, borderColor: 'rgba(255,68,85,0.4)' },
  deleteBtnTxt:  { color: '#FF4455', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  footer:        { color: 'rgba(255,255,255,0.2)', textAlign: 'center',
                   fontFamily: 'Outfit_400Regular', fontSize: 11, marginTop: 12 },
})
