import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.blue,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { height: 82, paddingTop: 8, borderTopColor: COLORS.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: () => <Text style={{ color: COLORS.blue, fontWeight: '800' }}>T</Text> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: () => <Text style={{ color: COLORS.muted, fontWeight: '800' }}>A</Text> }} />
    </Tabs>
  );
}
