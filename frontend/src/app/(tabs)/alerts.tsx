import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alarm, getRandomZone, useAlarms } from '../../context/AlarmContext';
import { useSession } from '../../context/SessionContext';
import { useTheme } from '../../context/ThemeContext';

const PROMPTS = [
  'Are you sure you want to change this alarm?',
  'Are you REALLY sure? It was doing perfectly fine.',
  "Final check: you know this button won't snooze, right?",
];

export default function AlarmsScreen() {
  const { dark, toggleTheme } = useTheme();
  const { alarms, setAlarms } = useAlarms();
  const { seconds, setSeconds } = useSession();
  const [confirm, setConfirm] = useState<{ step: number; required: number; action: () => void } | null>(null);
  const [buttonSwap, setButtonSwap] = useState(false);
  const [notice, setNotice] = useState('');
  const c = dark
    ? { bg: '#09090B', fg: '#FAFAFA', muted: '#9696A0', card: '#17171B', line: '#2B2B30', accent: '#93B4FF', accentBg: '#17213A', red: '#FF7777' }
    : { bg: '#F5F7FA', fg: '#191B20', muted: '#747984', card: '#FFFFFF', line: '#E6E8ED', accent: '#315FEA', accentBg: '#EEF2FF', red: '#D85656' };

  const mistake = (message: string) => {
    setSeconds((value) => Math.max(0, value - 5));
    setNotice(message); setTimeout(() => setNotice(''), 2600);
  };
  const beginConfirm = (action: () => void, extraConfirmations: number) => {
    setConfirm({ step: 0, required: 3 + extraConfirmations, action });
    setButtonSwap((value) => !value);
  };
  const confirmNext = () => {
    if (!confirm) return;
    if (confirm.step < confirm.required - 1) {
      setConfirm({ ...confirm, step: confirm.step + 1 }); setButtonSwap((value) => !value);
    } else { confirm.action(); setConfirm(null); }
  };
  const toggleAlarm = (alarm: Alarm) => beginConfirm(
    () => setAlarms((items) => items.map((item) => item.id === alarm.id
      ? { ...item, enabled: !item.enabled, zone: getRandomZone() }
      : item)),
    alarm.extraConfirmations,
  );
  const deleteAlarm = (alarm: Alarm) => beginConfirm(
    () => setAlarms((items) => items.filter((item) => item.id !== alarm.id)),
    alarm.extraConfirmations,
  );
  const btn = (label: string, onPress: () => void, primary = false, danger = false) => (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor: primary ? c.accent : c.card, borderColor: danger ? c.red : primary ? c.accent : c.line }]}>
      <Text style={{ color: primary ? '#FFFFFF' : danger ? c.red : c.fg, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, backgroundColor: c.bg }} onTouchEnd={toggleTheme}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: c.fg }]}>TIMEMACHINE<Text style={{ color: c.accent }}>.</Text></Text>
              <Text style={[styles.eyebrow, { color: c.muted }]}>THE SCHEDULE, SUCH AS IT IS</Text>
            </View>
            <View style={[styles.session, { backgroundColor: c.card, borderColor: c.line }]}>
              <Text style={{ color: c.red, fontSize: 12, fontWeight: '800' }}>00:{String(seconds).padStart(2, '0')}</Text>
              <Text style={{ color: c.muted, fontSize: 8, marginTop: 3 }}>SESSION LEFT</Text>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View><Text style={[styles.title, { color: c.fg }]}>Alarms</Text><Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>A count of {alarms.length}. Accuracy may vary.</Text></View>
            <Text style={[styles.count, { color: c.accent }]}>{String(alarms.length).padStart(2, '0')}</Text>
          </View>

          {alarms.length === 0
            ? <View style={[styles.empty, { backgroundColor: c.card, borderColor: c.line }]}><Text style={{ color: c.accent, fontSize: 29, marginRight: 14 }}>◷</Text><View><Text style={{ color: c.fg, fontWeight: '800', fontSize: 14 }}>No alarms. How peaceful.</Text><Text style={{ color: c.muted, fontSize: 11, marginTop: 5 }}>Set one from the Today tab. We&apos;ll make it complicated.</Text></View></View>
            : alarms.map((alarm) => (
              <View key={alarm.id} style={[styles.alarmCard, { backgroundColor: c.card, borderColor: c.line }]}>
                <View style={styles.alarmHeader}>
                  <View>
                    <Text style={[styles.time, { color: c.fg }]}>{String(alarm.hour).padStart(2, '0')}:{String(alarm.minute).padStart(2, '0')}</Text>
                    <Text style={{ color: alarm.enabled ? c.accent : c.muted, fontSize: 10, fontWeight: '800', marginTop: 3 }}>{alarm.enabled ? 'ARMED' : 'PAUSED'} · SNOOZE TAX +{alarm.extraConfirmations}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: alarm.enabled ? c.accent : c.muted }]} />
                </View>
                <Text style={{ color: c.muted, fontSize: 12, marginTop: 9 }}>Assigned to somewhere on Earth. Allegedly.</Text>
                {alarm.revealed && <Text style={{ color: c.muted, opacity: 0.6, fontSize: 9, marginTop: 6 }}>UTC{alarm.zone.offset >= 0 ? '+' : ''}{alarm.zone.offset} {alarm.zone.label} · Actual period: {alarm.period}</Text>}
                <View style={styles.actions}>{btn(alarm.enabled ? 'Turn off' : 'Turn on', () => toggleAlarm(alarm), alarm.enabled)}{btn('Delete', () => deleteAlarm(alarm), false, true)}</View>
              </View>
            ))}

          <Text style={[styles.footer, { color: c.muted }]}>TIME IS A SUGGESTION.</Text>
        </ScrollView>
        {!!notice && <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{notice}</Text></View>}

        <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
          <View style={styles.scrim} onTouchEnd={toggleTheme}>
            <View style={[styles.dialog, { backgroundColor: c.card }]}>
              <Text style={[styles.modalKicker, { color: c.accent }]}>CONFIRMATION {String((confirm?.step ?? 0) + 1).padStart(2, '0')} / {String(confirm?.required ?? 3).padStart(2, '0')}</Text>
              <Text style={[styles.modalTitle, { color: c.fg }]}>{confirm && confirm.step < PROMPTS.length ? PROMPTS[confirm.step] : 'Snooze tax: one more confirmation. You did this.'}</Text>
              <Text style={{ color: c.muted, fontSize: 11, marginTop: 8 }}>This action has consequences. Mostly more questions.</Text>
              <View style={[styles.actions, { flexDirection: buttonSwap ? 'row-reverse' : 'row', marginTop: 20 }]}>
                {btn('Go back', () => { setConfirm(null); mistake('Wrong choice. Five seconds, please.'); })}
                {btn(confirm && confirm.step === confirm.required - 1 ? 'I accept' : 'Confirm', confirmNext, true)}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { fontSize: 9, letterSpacing: 1.2, fontWeight: '700', marginTop: 4 },
  session: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center', minWidth: 91 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 15 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.7 },
  count: { fontSize: 27, fontWeight: '800', fontVariant: ['tabular-nums'] },
  empty: { minHeight: 88, borderWidth: 1, borderRadius: 17, padding: 16, flexDirection: 'row', alignItems: 'center' },
  alarmCard: { borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 11 },
  alarmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  button: { minHeight: 42, paddingHorizontal: 14, borderWidth: 1, borderRadius: 11, justifyContent: 'center', alignItems: 'center', flex: 1 },
  footer: { textAlign: 'center', marginTop: 23, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  toast: { position: 'absolute', bottom: 18, left: 18, right: 18, backgroundColor: '#252932', borderRadius: 12, padding: 13, elevation: 9 },
  toastText: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  scrim: { flex: 1, backgroundColor: '#080B12B8', justifyContent: 'center', padding: 22 },
  dialog: { borderRadius: 22, padding: 20, maxWidth: 460, width: '100%', alignSelf: 'center' },
  modalKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  modalTitle: { fontSize: 20, fontWeight: '800', lineHeight: 27, marginTop: 8 },
});
