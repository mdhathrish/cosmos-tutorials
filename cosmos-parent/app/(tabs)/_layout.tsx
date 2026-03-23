import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useColors } from '../../constants/theme'
import { BlurView } from 'expo-blur'
import { Home, Brain, MapPin, BookOpen } from 'lucide-react-native'

function TabIcon({ IconComponent, label, focused }: { IconComponent: any; label: string; focused: boolean }) {
  const Colors = useColors()
  return (
    <View style={styles.tabItem}>
      <IconComponent size={22} color={focused ? Colors.primary : Colors.muted} strokeWidth={focused ? 2.5 : 2} />
      <Text numberOfLines={1} style={[styles.tabLabel, { color: focused ? Colors.primary : Colors.muted, fontFamily: focused ? 'Outfit_600SemiBold' : 'Outfit_500Medium' }]}>
        {label}
      </Text>
    </View>
  )
}

export default function TabLayout() {
  const Colors = useColors()
  const isDark = Colors.bg === '#030409'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 75,
          paddingBottom: 15,
        },
        tabBarBackground: () => (
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon IconComponent={Home} label="Home" focused={focused} /> }} />
      <Tabs.Screen name="performance" options={{ tabBarIcon: ({ focused }) => <TabIcon IconComponent={Brain} label="Skills" focused={focused} /> }} />
      <Tabs.Screen name="attendance" options={{ tabBarIcon: ({ focused }) => <TabIcon IconComponent={MapPin} label="Attend" focused={focused} /> }} />
      <Tabs.Screen name="homework" options={{ tabBarIcon: ({ focused }) => <TabIcon IconComponent={BookOpen} label="HW" focused={focused} /> }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingTop: 12, gap: 5 },
  tabLabel: { fontSize: 10, marginTop: 2 },
})
