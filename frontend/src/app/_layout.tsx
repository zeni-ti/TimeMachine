import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoutineProvider } from '../context/RoutineContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RoutineProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="wake" />
          <Stack.Screen name="duration" />
          <Stack.Screen name="routine" />
        </Stack>
      </RoutineProvider>
    </SafeAreaProvider>
  );
}
