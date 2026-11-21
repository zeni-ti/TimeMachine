import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { useRoutine } from '../context/RoutineContext';
import { COLORS } from '../theme/colors';

export default function WakeScreen() {
  const routine = useRoutine();

  const setHour = (digit: string) => {
    const candidate = Number(`${routine.wakeHours}${digit}`);
    const hour = candidate > 23 ? Number(digit) : candidate;
    routine.setWakeHours(String(hour % 24).padStart(2, '0'));
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.body}>
        <ScreenHeader eyebrow="Wake up at" />
        <Text style={styles.time}>{routine.wakeLabel}</Text>
        <Text style={styles.hint}>Choose when you want to start the day</Text>

        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <Pressable key={digit} onPress={() => setHour(digit)} style={styles.key}>
              <Text style={styles.keyText}>{digit}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setHour('0')} style={styles.key}><Text style={styles.keyText}>0</Text></Pressable>
          <Pressable onPress={() => { routine.setWakeHours('07'); routine.setWakeMinutes('30'); }} style={styles.key}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <Pressable style={styles.button} onPress={() => router.push('/duration')}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.white },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  time: { color: COLORS.ink, fontSize: 54, lineHeight: 62, fontWeight: '800', letterSpacing: -2, marginTop: -16 },
  hint: { color: COLORS.muted, fontSize: 15 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 28 },
  key: { width: '30%', height: 58, borderRadius: 16, backgroundColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center' },
  keyText: { color: COLORS.ink, fontSize: 22, fontWeight: '700' },
  resetText: { color: COLORS.blue, fontSize: 13, fontWeight: '700' },
  button: { height: 58, borderRadius: 18, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginTop: 'auto', marginBottom: 24 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
