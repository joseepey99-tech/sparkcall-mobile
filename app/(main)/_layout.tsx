import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../../lib/theme'
import Svg, { Path } from 'react-native-svg'

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
function GearIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </Svg>
}

export default function MainLayout() {
  const insets = useSafeAreaInsets()

  return (
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
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <GearIcon color={color}/> }}/>
      <Tabs.Screen name="profile/[id]" options={{ href: null }}/>
      <Tabs.Screen name="chat/[id]"    options={{ href: null }}/>
      <Tabs.Screen name="call/[id]"    options={{ href: null }}/>
      <Tabs.Screen name="review/[id]"  options={{ href: null }}/>
    </Tabs>
  )
}
