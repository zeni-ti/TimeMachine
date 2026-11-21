import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch } from '../../components/Switch';
import { useRoutine } from '../../context/RoutineContext';
import { COLORS } from '../../theme/colors';

export default function TodayScreen() {
  const routine = useRoutine();

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>Tomorrow</Text>
            <Text style={styles.title}>Your day, on time.</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>KB</Text></View>
        </View>

        <Pressable onPress={() => router.push('/wake')} style={styles.primaryCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardLabelRow}>
              <View style={styles.sunIcon}><Text style={styles.sunText}>☀</Text></View>
              <Text style={styles.cardLabel}>Wake up</Text>
            </View>
            <Switch value={routine.alarmEnabled} onChange={() => routine.setAlarmEnabled(!routine.alarmEnabled)} />
          </View>
          <Text style={styles.heroTime}>{routine.wakeLabel}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>Mon, Tue, Wed, Thu, Fri</Text>
            <Text style={styles.cardEdit}>Edit</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sleep rhythm</Text>
          <Pressable onPress={() => router.push('/duration')}><Text style={styles.link}>Adjust</Text></Pressable>
        </View>

        <Pressable style={styles.infoCard} onPress={() => router.push('/duration')}>
          <View style={styles.ring}><Text style={styles.ringText}>{routine.duration}</Text><Text style={styles.ringUnit}>hrs</Text></View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Recommended sleep</Text>
            <Text style={styles.infoCopy}>Go to bed around {routine.bedtimeLabel} for a full night.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Next</Text></View>
        <View style={styles.nextCard}>
          <View style={styles.dot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nextTitle}>Bedtime reminder</Text>
            <Text style={styles.nextCopy}>Tonight at {routine.bedtimeLabel}</Text>
          </View>
          <Switch value={routine.bedtimeEnabled} onChange={() => routine.setBedtimeEnabled(!routine.bedtimeEnabled)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  eyebrow: { color: COLORS.blue, fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: COLORS.ink, fontSize: 28, lineHeight: 34, fontWeight: '800', marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.pale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.navy, fontWeight: '800' },
  primaryCard: { backgroundColor: COLORS.navy, borderRadius: 28, padding: 22, minHeight: 205, elevation: 8, shadowColor: '#163E78', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center' },
  sunIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  sunText: { color: '#FFD667', fontSize: 16 },
  cardLabel: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginLeft: 9 },
  heroTime: { color: COLORS.white, fontSize: 72, lineHeight: 82, fontWeight: '800', letterSpacing: -3, marginTop: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardFooterText: { color: '#CAD8EE', fontSize: 13 },
  cardEdit: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  link: { color: COLORS.blue, fontSize: 14, fontWeight: '700' },
  infoCard: { height: 104, borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  ring: { width: 70, height: 70, borderRadius: 35, borderWidth: 7, borderColor: '#D7E4FF', alignItems: 'center', justifyContent: 'center' },
  ringText: { color: COLORS.navy, fontSize: 21, lineHeight: 21, fontWeight: '800' },
  ringUnit: { color: COLORS.muted, fontSize: 10 },
  infoText: { flex: 1, marginHorizontal: 12 },
  infoTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  infoCopy: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  chevron: { color: '#AAB3C2', fontSize: 30 },
  nextCard: { minHeight: 82, borderRadius: 20, backgroundColor: COLORS.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.blue, marginRight: 12 },
  nextTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  nextCopy: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
});
