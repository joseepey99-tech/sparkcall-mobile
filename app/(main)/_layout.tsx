import { Tabs } from 'expo-router'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import Svg, { Path } from 'react-native-svg'
import { MessageCircle } from 'lucide-react-native'
import IncomingCallMobile from '../../components/IncomingCallMobile'

function CompassIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13l-5 8h4v3l5-8h-4V7z"/>
  </Svg>
}
function BoltIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Path d="M7 2v11h3v9l7-12h-4l4-8z"/>
  </Svg>
}
function StarIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </Svg>
}
function ClockIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
  </Svg>
}
function GearIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </Svg>
}

export default function MainLayout() {
  const insets = useSafeAreaInsets()

    useEffect(() => {
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    let currentUserId: string | null = null

    const beat = async () => {
      let user = null
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase.auth.getUser()
        if (data?.user) { user = data.user; break }
        await new Promise(r => setTimeout(r, 500))
      }
      if (!user) return
      currentUserId = user.id
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
    }

    const startHeartbeat = () => {
      beat()
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      heartbeatTimer = setInterval(beat, 20000)
    }

    const stopHeartbeat = () => {
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    }

    startHeartbeat()

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') startHeartbeat()
      else stopHeartbeat()
    })

    return () => {
      sub.remove()
      stopHeartbeat()
    }
  }, [])

  return (
    <>
      <IncomingCallMobile/>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.rose,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: 'Outfit_500Medium', fontSize: 11 },
      }}>
        <Tabs.Screen name="home"     options={{ title: 'Discover', tabBarIcon: ({ color }) => <CompassIcon color={color}/> }}/>
        <Tabs.Screen name="credits"  options={{ title: 'Sparks',   tabBarIcon: ({ color }) => <BoltIcon color={color}/> }}/>
        <Tabs.Screen name="premium"  options={{ title: 'Premium',  tabBarIcon: ({ color }) => <StarIcon color={color}/> }}/>
        <Tabs.Screen name="history"  options={{ title: 'History',  tabBarIcon: ({ color }) => <ClockIcon color={color}/> }}/>
        <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ color }) => <MessageCircle size={22} color={color}/> }}/>
        <Tabs.Screen name="settings" options={{ href: null, tabBarStyle: { display: 'none' } }}/>
        <Tabs.Screen name="profile/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }}/>
        <Tabs.Screen name="chat/[id]"    options={{ href: null, tabBarStyle: { display: 'none' } }}/>
        <Tabs.Screen name="camera" options={{ href: null, tabBarStyle: { display: 'none' } }}/>
        <Tabs.Screen name="camera-preview" options={{ href: null, tabBarStyle: { display: 'none' } }}/>
        <Tabs.Screen name="call/[id]"    options={{ href: null, tabBarStyle: { display: 'none' } }}/>
        <Tabs.Screen name="review/[id]"  options={{ href: null, tabBarStyle: { display: 'none' } }}/>
      </Tabs>
    </>
  )
}
