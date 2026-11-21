import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { useRoutine } from '../context/RoutineContext';
import { COLORS } from '../theme/colors';

export default function RoutineScreen() {
  const routine = useRoutine();

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.body}>
        <ScreenHeader eyebrow="All set" />
        <Text style={styles.title}>Your routine is ready.</Text>

        <View style={styles.timelineCard}>
          <View style={styles.timelineRow}>
            <View style={[styles.icon, { backgroundColor: '#EAF0FF' }]}><Text style={styles.iconText}>☾</Text></View>
            <View style={styles.timelineCopy}><Text style={styles.timelineLabel}>Wind down</Text><Text style={styles.timelineValue}>{routine.bedtimeLabel}</Text></View>
          </View>
          <View style={styles.line} />
          <View style={styles.timelineRow}>
            <View style={[styles.icon, { backgroundColor: '#FFF4D7' }]}><Text style={styles.iconText}>☀</Text></View>
            <View style={styles.timelineCopy}><Text style={styles.timelineLabel}>Wake up</Text><Text style={styles.timelineValue}>{routine.wakeLabel}</Text></View>
          </View>
        </View>

        <View style={styles.successCard}>
          <Text style={styles.successTitle}>{routine.duration}-hour sleep goal</Text>
          <Text style={styles.successCopy}>Notifications will help you stay on schedule.</Text>
        </View>

        <Pressable style={styles.button} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.white },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  title: { color: COLORS.ink, fontSize: 34, lineHeight: 40, fontWeight: '800', marginTop: -16 },
  timelineCard: { marginTop: 32, borderRadius: 24, borderWidth: 1, borderColor: COLORS.line, padding: 18 },
  timelineRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  timelineCopy: { marginLeft: 14 },
  timelineLabel: { color: COLORS.muted, fontSize: 13 },
  timelineValue: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  line: { width: 2, height: 28, backgroundColor: COLORS.line, marginLeft: 21 },
  successCard: { marginTop: 18, borderRadius: 20, backgroundColor: '#F5F8FD', padding: 18 },
  successTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  successCopy: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  button: { height: 58, borderRadius: 18, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginTop: 'auto', marginBottom: 24 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
