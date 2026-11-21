import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch } from '../../components/Switch';
import { useRoutine } from '../../context/RoutineContext';
import { COLORS } from '../../theme/colors';

export default function AlertsScreen() {
  const routine = useRoutine();

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Notifications</Text>
        <Text style={styles.title}>Alerts</Text>

        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: '#EAF0FF' }]}><Text style={styles.iconText}>☾</Text></View>
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>Bedtime reminder</Text>
            <Text style={styles.cardSubtitle}>Tonight at {routine.bedtimeLabel}</Text>
          </View>
          <Switch value={routine.bedtimeEnabled} onChange={() => routine.setBedtimeEnabled(!routine.bedtimeEnabled)} />
        </View>

        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: '#FFF4D7' }]}><Text style={styles.iconText}>☀</Text></View>
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>Wake alarm</Text>
            <Text style={styles.cardSubtitle}>Every weekday at {routine.wakeLabel}</Text>
          </View>
          <Switch value={routine.alarmEnabled} onChange={() => routine.setAlarmEnabled(!routine.alarmEnabled)} />
        </View>

        <Pressable style={styles.button} onPress={() => router.push('/wake')}>
          <Text style={styles.buttonText}>Edit schedule</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingHorizontal: 24, paddingTop: 18 },
  eyebrow: { color: COLORS.blue, fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: COLORS.ink, fontSize: 32, fontWeight: '800', marginTop: 5, marginBottom: 24 },
  card: { minHeight: 92, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  cardCopy: { flex: 1, marginLeft: 12 },
  cardTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  cardSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  button: { height: 58, borderRadius: 18, backgroundColor: COLORS.pale, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonText: { color: COLORS.blue, fontSize: 16, fontWeight: '800' },
});
