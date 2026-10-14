import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import type { IconName } from '@/components/ui';
import { useTheme } from '@/lib/theme';

const icon =
  (active: IconName, inactive: IconName) =>
  ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Library', tabBarIcon: icon('albums', 'albums-outline') }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="upcoming" options={{ title: 'Upcoming', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
