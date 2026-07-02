import { useState, useEffect, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, StyleSheet, Pressable, RefreshControl,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/theme'

const REGIONS = ['All','Africa','Asia','Europe','Americas','Middle East','Oceania']
const TABS = ['Everyone', 'Hosts', 'Callers']

export default function Home() {
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const [users, setUsers]     = useState<any[]>([])
  const [search, setSearch]   = useState('')
  const [region, setRegion]   = useState('All')
  const [tab, setTab]         = useState('Everyone')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => { fetchData() }, [region])

  useEffect(() => {
    channelRef.current = supabase
      .channel('presence-updates')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          setUsers(prev =>
            prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u)
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channelRef.current) }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: prof }, { data: all }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      region === 'All'
        ? supabase.from('profiles').select('*').neq('id', user!.id)
        : supabase.from('profiles').select('*').neq('id', user!.id).eq('city', region),
    ])
    setProfile(prof)
    setUsers(all || [])
    setLoading(false)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase())
    const matchTab = tab === 'Everyone' ? true
      : tab === 'Hosts' ? u.is_host
      : !u.is_host
    return matchSearch && matchTab
  })

  const renderCard = ({ item: user }: any) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push({
        pathname: '/(main)/profile/[id]',
        params: { id: user.id },
      })}>
      <View style={[s.avatar, user.is_host && s.avatarHost]}>
        <Text style={[s.avatarTxt, user.is_host && s.avatarTxtHost]}>
          {user.name?.charAt(0)}
        </Text>
      </View>
      {user.online && <View style={s.onlineDot}/>}
      {/* Badge — Host or Caller */}
      <View style={[s.badge, user.is_host ? s.badgeHost : s.badgeCaller]}>
        <Text style={[s.badgeTxt, user.is_host ? s.badgeTxtHost : s.badgeTxtCaller]}>
          {user.is_host ? 'HOST' : 'CALLER'}
        </Text>
      </View>
      <Text style={s.userName} numberOfLines={1}>{user.name?.split(' ')[0]}</Text>
      <Text style={s.userRegion}>{user.city}</Text>
      <View style={s.ratePill}>
        <Text style={s.rateTxt}>⚡{user.rate}/min</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Discover ✦</Text>
          <Text style={s.sub}>Find your spark</Text>
        </View>
        <View style={s.balancePill}>
          <Text style={s.balanceTxt}>⚡ {profile?.credits || 0}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search} onChangeText={setSearch}
          placeholder="Search people…"
          placeholderTextColor={C.muted}
        />
      </View>

      {/* Tabs */}
      <View style={s.tabsWrap}>
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {/* Region filter */}
      <View style={s.regionsWrap}>
        <FlatList
          data={REGIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.regionsContent}
          keyExtractor={r => r}
          renderItem={({ item: r }) => (
            <Pressable onPress={() => setRegion(r)}
              style={[s.regionChip, region === r && s.regionChipActive]}>
              <Text style={[s.regionTxt, region === r && s.regionTxtActive]}>{r}</Text>
            </Pressable>
          )}
        />
      </View>

      {/* Grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={[s.grid, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={C.rose}/>}
        ListEmptyComponent={
          <Text style={s.empty}>{loading ? 'Loading…' : '0 users available'}</Text>
        }
        keyExtractor={u => u.id}
        renderItem={renderCard}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: C.bg },
  header:           { flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', paddingHorizontal: 20,
                      paddingTop: 12, paddingBottom: 12 },
  greeting:         { fontSize: 26, color: C.white, fontFamily: 'Outfit_700Bold' },
  sub:              { fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  balancePill:      { backgroundColor: 'rgba(201,164,106,0.15)', borderRadius: 99,
                      paddingHorizontal: 12, paddingVertical: 7,
                      borderWidth: 1, borderColor: 'rgba(201,164,106,0.3)' },
  balanceTxt:       { color: C.gold, fontFamily: 'Outfit_700Bold', fontSize: 12 },
  searchWrap:       { paddingHorizontal: 20, marginBottom: 10 },
  search:           { backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                      color: C.white, fontFamily: 'Outfit_400Regular', fontSize: 14 },
  tabsWrap:         { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 10 },
  tabBtn:           { flex: 1, paddingVertical: 8, borderRadius: 99, alignItems: 'center',
                      backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabBtnActive:     { backgroundColor: 'rgba(214,63,110,0.15)', borderColor: C.rose },
  tabTxt:           { color: C.muted, fontFamily: 'Outfit_500Medium', fontSize: 12 },
  tabTxtActive:     { color: C.rose },
  regionsWrap:      { height: 46, marginBottom: 4 },
  regionsContent:   { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  regionChip:       { height: 34, paddingHorizontal: 16, justifyContent: 'center',
                      alignItems: 'center', borderRadius: 99, backgroundColor: C.card,
                      borderWidth: 1, borderColor: C.border },
  regionChipActive: { backgroundColor: 'rgba(214,63,110,0.15)', borderColor: C.rose },
  regionTxt:        { color: C.muted, fontFamily: 'Outfit_500Medium', fontSize: 12 },
  regionTxtActive:  { color: C.rose },
  grid:             { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  card:             { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
                      borderRadius: 18, padding: 16, alignItems: 'center', gap: 6 },
  avatar:           { width: 64, height: 64, borderRadius: 32,
                      backgroundColor: 'rgba(214,63,110,0.2)',
                      borderWidth: 1.5, borderColor: 'rgba(214,63,110,0.5)',
                      alignItems: 'center', justifyContent: 'center' },
  avatarHost:       { backgroundColor: 'rgba(201,164,106,0.2)',
                      borderColor: 'rgba(201,164,106,0.5)' },
  avatarTxt:        { fontSize: 24, color: C.rose, fontFamily: 'Outfit_700Bold' },
  avatarTxtHost:    { color: C.gold },
  badge:            { position: 'absolute', top: 6, left: 6, borderRadius: 99,
                      paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  badgeHost:        { backgroundColor: 'rgba(201,164,106,0.2)', borderColor: 'rgba(201,164,106,0.4)' },
  badgeCaller:      { backgroundColor: 'rgba(214,63,110,0.15)', borderColor: 'rgba(214,63,110,0.3)' },
  badgeTxt:         { fontSize: 8, fontFamily: 'Outfit_700Bold', letterSpacing: 1 },
  badgeTxtHost:     { color: C.gold },
  badgeTxtCaller:   { color: C.rose },
  onlineDot:        { position: 'absolute', top: 14, right: 14,
                      width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
  userName:         { fontSize: 15, color: C.white, fontFamily: 'Outfit_700Bold' },
  userRegion:       { fontSize: 11, color: C.muted, fontFamily: 'Outfit_400Regular' },
  ratePill:         { backgroundColor: 'rgba(201,164,106,0.12)', borderRadius: 99,
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderWidth: 1, borderColor: 'rgba(201,164,106,0.25)' },
  rateTxt:          { color: C.gold, fontSize: 11, fontFamily: 'Outfit_700Bold' },
  empty:            { color: C.muted, textAlign: 'center', marginTop: 80,
                      fontFamily: 'Outfit_400Regular', fontSize: 14 },
})