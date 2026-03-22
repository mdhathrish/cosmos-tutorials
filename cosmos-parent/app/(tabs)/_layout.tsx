import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/theme'
import { BlurView } from 'expo-blur'
import { Home, Brain, MapPin, BookOpen } from 'lucide-react-native'

function TabIcon({ IconComponent, label, focused }: { IconComponent: any; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <IconComponent size={24} color={focused ? Colors.primary : Colors.muted} strokeWidth={focused ? 2.5 : 2} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon IconComponent={Home} label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon IconComponent={Brain} label="Skills" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon IconComponent={MapPin} label="Attend" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon IconComponent={BookOpen} label="HW" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingTop: 6, gap: 4 },
  tabItemActive: {},
  tabLabel: { fontSize: 10, color: Colors.muted, fontFamily: 'Outfit_500Medium' },
  tabLabelActive: { color: Colors.primary, fontFamily: 'Outfit_600SemiBold' },
})
