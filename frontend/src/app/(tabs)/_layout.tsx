import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export default function TabsLayout() {
  const { dark } = useTheme();
  const palette = dark
    ? { background: '#09090B', active: '#93B4FF', inactive: '#9696A0', border: '#2B2B30' }
    : { background: '#FFFFFF', active: COLORS.blue, inactive: COLORS.muted, border: COLORS.line };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.active,
        tabBarInactiveTintColor: palette.inactive,
        tabBarStyle: { height: 82, paddingTop: 8, backgroundColor: palette.background, borderTopColor: palette.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '800' }}>T</Text> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alarms', tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '800' }}>A</Text> }} />
    </Tabs>
  );
}
