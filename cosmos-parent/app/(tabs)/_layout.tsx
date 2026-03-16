// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/theme'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={styles.emoji}>{emoji}</Text>
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
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧠" label="Skills" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📍" label="Attend" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" label="HW" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingTop: 6, gap: 3 },
  tabItemActive: {},
  emoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: Colors.muted, fontWeight: '500' },
  tabLabelActive: { color: Colors.primary },
})
