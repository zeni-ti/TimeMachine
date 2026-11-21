import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoutineProvider } from '../context/RoutineContext';
import { SplashProvider, useSplash } from '../context/SplashContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AlarmProvider } from '../context/AlarmContext';
import { SessionProvider } from '../context/SessionContext';

function AppNavigator() {
  const { dark } = useTheme();
  const { splashVisible } = useSplash();

  return (
    <>
      <StatusBar style={splashVisible || dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="wake" />
        <Stack.Screen name="duration" />
        <Stack.Screen name="routine" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SplashProvider>
          <SessionProvider>
            <AlarmProvider>
              <RoutineProvider>
                <AppNavigator />
              </RoutineProvider>
            </AlarmProvider>
          </SessionProvider>
        </SplashProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
