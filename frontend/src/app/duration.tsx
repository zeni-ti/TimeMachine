import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { useRoutine } from '../context/RoutineContext';
import { COLORS } from '../theme/colors';

export default function DurationScreen() {
  const routine = useRoutine();

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.body}>
        <ScreenHeader eyebrow="Sleep goal" />
        <Text style={styles.time}>{routine.duration} hours</Text>
        <Text style={styles.hint}>How much rest do you need?</Text>

        <View style={styles.options}>
          {[7, 8, 9].map((hours) => {
            const active = routine.duration === hours;
            return (
              <Pressable key={hours} onPress={() => routine.setDuration(hours)} style={[styles.option, active && styles.optionActive]}>
                <Text style={[styles.optionNumber, active && styles.optionTextActive]}>{hours}</Text>
                <Text style={[styles.optionUnit, active && styles.optionTextActive]}>hours</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bedtimeCard}>
          <Text style={styles.bedtimeLabel}>Suggested bedtime</Text>
          <Text style={styles.bedtimeTime}>{routine.bedtimeLabel}</Text>
        </View>

        <Pressable style={styles.button} onPress={() => router.push('/routine')}>
          <Text style={styles.buttonText}>Save plan</Text>
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
  options: { flexDirection: 'row', gap: 10, marginTop: 36 },
  option: { flex: 1, height: 116, borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  optionActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  optionNumber: { color: COLORS.ink, fontSize: 34, lineHeight: 38, fontWeight: '800' },
  optionUnit: { color: COLORS.muted, fontSize: 12 },
  optionTextActive: { color: COLORS.white },
  bedtimeCard: { marginTop: 24, height: 92, borderRadius: 22, backgroundColor: COLORS.pale, alignItems: 'center', justifyContent: 'center' },
  bedtimeLabel: { color: COLORS.muted, fontSize: 13 },
  bedtimeTime: { color: COLORS.navy, fontSize: 30, fontWeight: '800', marginTop: 4 },
  button: { height: 58, borderRadius: 18, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginTop: 'auto', marginBottom: 24 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
