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

export default function Home() {
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const [hosts, setHosts]     = useState<any[]>([])
  const [search, setSearch]   = useState('')
  const [region, setRegion]   = useState('All')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => { fetchData() }, [region])

  useEffect(() => {
    // Subscribe to real-time presence updates on profiles
    channelRef.current = supabase
      .channel('host-presence')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          setHosts(prev =>
            prev.map(h =>
              h.id === payload.new.id ? { ...h, online: payload.new.online } : h
            )
          )
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: prof }, { data: h }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      region === 'All'
        ? supabase.from('profiles').select('*').eq('is_host', true)
        : supabase.from('profiles').select('*').eq('is_host', true).eq('city', region),
    ])
    setProfile(prof)
    setHosts(h || [])
    setLoading(false)
  }

  const filtered = hosts.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase())
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
          placeholder="Search hosts…"
          placeholderTextColor={C.muted}
        />
      </View>

      {/* Region filter — fixed height so chips don't stretch */}
      <View style={s.regionsWrap}>
        <FlatList
          data={REGIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.regionsContent}
          keyExtractor={r => r}
          renderItem={({ item: r }) => (
            <Pressable
              onPress={() => setRegion(r)}
              style={[s.regionChip, region === r && s.regionChipActive]}>
              <Text style={[s.regionTxt, region === r && s.regionTxtActive]}>{r}</Text>
            </Pressable>
          )}
        />
      </View>

      {/* Host grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={[s.grid, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={C.rose}/>
        }
        ListEmptyComponent={
          <Text style={s.empty}>{loading ? 'Loading…' : 'No hosts found'}</Text>
        }
        keyExtractor={h => h.id}
        renderItem={({ item: host }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => router.push({
              pathname: '/(main)/profile/[id]',
              params: { id: host.id },
            })}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{host.name?.charAt(0)}</Text>
            </View>
            {/* Online dot — only shown when host.online is true */}
            {host.online && <View style={s.onlineDot}/>}
            <Text style={s.hostName} numberOfLines={1}>{host.name?.split(' ')[0]}</Text>
            <Text style={s.hostRegion}>{host.city}</Text>
            <View style={s.ratePill}>
              <Text style={s.rateTxt}>⚡{host.rate}/min</Text>
            </View>
          </TouchableOpacity>
        )}
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
  // ── Fixed height container for region chips ──
  regionsWrap:      { height: 46, marginBottom: 4 },
  regionsContent:   { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  regionChip:       { height: 34, paddingHorizontal: 16,
                      justifyContent: 'center', alignItems: 'center',
                      borderRadius: 99, backgroundColor: C.card,
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
  avatarTxt:        { fontSize: 24, color: C.rose, fontFamily: 'Outfit_700Bold' },
  onlineDot:        { position: 'absolute', top: 14, right: 14,
                      width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
  hostName:         { fontSize: 15, color: C.white, fontFamily: 'Outfit_700Bold' },
  hostRegion:       { fontSize: 11, color: C.muted, fontFamily: 'Outfit_400Regular' },
  ratePill:         { backgroundColor: 'rgba(201,164,106,0.12)', borderRadius: 99,
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderWidth: 1, borderColor: 'rgba(201,164,106,0.25)' },
  rateTxt:          { color: C.gold, fontSize: 11, fontFamily: 'Outfit_700Bold' },
  empty:            { color: C.muted, textAlign: 'center', marginTop: 80,
                      fontFamily: 'Outfit_400Regular', fontSize: 14 },
})
