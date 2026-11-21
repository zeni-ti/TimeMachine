import { useCallback, useEffect, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch } from '../../components/Switch';
import { useTheme } from '../../context/ThemeContext';
import { createAudioPlayer } from 'expo-audio';
import {
  api,
  type BackendAlarm,
  type RevealResponse,
} from '../../services/api';

const FALLBACK_SOLUTION = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
const FALLBACK_PUZZLE = [1, 0, 3, 0, 0, 4, 0, 2, 2, 0, 4, 0, 0, 3, 0, 1];

export default function AlertsScreen() {
  const { dark } = useTheme();
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [revealedMap, setRevealedMap] = useState<Record<string, RevealResponse>>({});
  const [notice, setNotice] = useState('');

  // Ringing & Sudoku state
  const [ringing, setRinging] = useState(false);
  const [sudokuId, setSudokuId] = useState<string | null>(null);
  const [puzzleMask, setPuzzleMask] = useState<number[]>(FALLBACK_PUZZLE);
  const [grid, setGrid] = useState<number[]>(FALLBACK_PUZZLE);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [ringReveal, setRingReveal] = useState<RevealResponse | null>(null);
  const [ringStartedAt, setRingStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const c = dark
    ? { bg: '#09090B', fg: '#FAFAFA', muted: '#9696A0', card: '#17171B', line: '#2B2B30', accent: '#93B4FF', accentBg: '#17213A', red: '#FF7777' }
    : { bg: '#F5F7FA', fg: '#191B20', muted: '#747984', card: '#FFFFFF', line: '#E6E8ED', accent: '#315FEA', accentBg: '#EEF2FF', red: '#D85656' };

  const showToast = useCallback((message: string, duration = 2800) => {
    setNotice(message);
    setTimeout(() => setNotice(''), duration);
  }, []);

  const loadAlarms = useCallback(async () => {
    try {
      const data = await api.listAlarms();
      setAlarms(data.alarms);
    } catch {
      showToast('Backend offline—check FastAPI on port 8000.');
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    api.listAlarms()
      .then((data) => {
        if (active) setAlarms(data.alarms);
      })
      .catch(() => {
        if (active) showToast('Backend offline—check FastAPI on port 8000.');
      });
    return () => {
      active = false;
    };
  }, [showToast]);
  
  const startRingingWithSudoku = useCallback(async (reveal: RevealResponse | null) => {
    setRingReveal(reveal);
    setRingStartedAt(Date.now());
    setActiveCell(null);
    setRinging(true);
    try {
      const s = await api.getSudoku();
      const flat = s.puzzle.flat().map((v) => v ?? 0);
      setSudokuId(s.challenge_id);
      setPuzzleMask(flat);
      setGrid(flat);
    } catch {
      setSudokuId(null);
      setPuzzleMask(FALLBACK_PUZZLE);
      setGrid(FALLBACK_PUZZLE);
    }
  }, []);

  // Poll UTC trigger timestamps every 5 seconds
  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now());
      const currentMs = Date.now();
      alarms.forEach((alarm) => {
        if (!alarm.is_enabled || !alarm.next_trigger_utc || revealedMap[alarm.id]) return;
        if (currentMs >= new Date(alarm.next_trigger_utc).getTime()) {
          void (async () => {
            try {
              const reveal = await api.revealAlarm(alarm.id);
              setRevealedMap((prev) => ({ ...prev, [alarm.id]: reveal }));
              await api.toggleAlarm(alarm.id);
              await loadAlarms();
              await startRingingWithSudoku(reveal);
            } catch {
              await startRingingWithSudoku(null);
            }
          })();
        }
      });
    }, 5000);
    return () => clearInterval(tick);
  }, [alarms, revealedMap, loadAlarms, startRingingWithSudoku]);

  // Continuous Alarm Audio Loop
  useEffect(() => {
    let nativePlayer: any = null;
    let webAudio: any = null;
    let active = true;

    async function playAudio() {
      if (!ringing) return;
      try {
        const player = createAudioPlayer(require('../../../assets/alarm.mp3'));
        player.loop = true;
        player.volume = 1.0;
        player.play();
        if (active) nativePlayer = player;
        else player.pause();
      } catch {}
    }

    if (ringing) void playAudio();

    return () => {
      active = false;
      if (nativePlayer) { try { nativePlayer.pause(); nativePlayer.remove?.(); } catch {} }
      if (webAudio) { try { webAudio.pause(); } catch {} }
    };
  }, [ringing]);

  const toggleAlarmSwitch = async (id: string) => {
    try {
      await api.toggleAlarm(id);
      await loadAlarms();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const deleteAlarmItem = async (id: string) => {
    try {
      await api.deleteAlarm(id);
      await loadAlarms();
      showToast('Alarm deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const enterDigit = async (value: number) => {
    if (activeCell === null || puzzleMask[activeCell] !== 0) return;
    const next = [...grid];
    next[activeCell] = value;
    setGrid(next);

    if (next.every((n) => n !== 0)) {
      if (sudokuId) {
        const matrix = [
          next.slice(0, 4),
          next.slice(4, 8),
          next.slice(8, 12),
          next.slice(12, 16),
        ];
        try {
          const res = await api.verifySudoku(sudokuId, matrix);
          if (res.passed) {
            setRinging(false);
            showToast(res.message);
          } else {
            showToast(res.message);
          }
          return;
        } catch {}
      }
      if (next.every((n, i) => n === FALLBACK_SOLUTION[i])) {
        setRinging(false);
      } else {
        showToast('Not quite right! Check each row, column, and 2x2 box.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>Schedules & Timezones</Text>
        <Text style={[styles.title, { color: c.fg }]}>Scheduled Alarms</Text>

        {alarms.length === 0 ? (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
            <Text style={{ color: c.muted, textAlign: 'center', paddingVertical: 16 }}>No active alarms configured yet.</Text>
          </View>
        ) : (
          alarms.map((alarm) => {
            const revealed = revealedMap[alarm.id];
            return (
              <View key={alarm.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
                <View style={[styles.icon, { backgroundColor: c.accentBg }]}><Text style={styles.iconText}>⏰</Text></View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: c.fg }]}>{alarm.target_time} ({alarm.display_timezone})</Text>
                  <Text style={[styles.cardSubtitle, { color: c.muted }]}>
                    {alarm.is_enabled ? 'Active · Malicious timezone armed' : 'Paused'}
                  </Text>
                  {revealed && (
                    <Text style={{ color: c.red, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                      ⚠️ Rang in {revealed.utc_offset} {revealed.effective_timezone}!
                    </Text>
                  )}
                </View>
                <Switch value={alarm.is_enabled} onChange={() => { void toggleAlarmSwitch(alarm.id); }} />
                <Pressable onPress={() => { void deleteAlarmItem(alarm.id); }} style={styles.deleteBtn}>
                  <Text style={{ color: c.red, fontSize: 12, fontWeight: '800' }}>✕</Text>
                </Pressable>
              </View>
            );
          })
        )}

        {/* Demo Trigger for Judges */}
        <Pressable
          onPress={() => {
            const firstActive = alarms.find((a) => a.is_enabled);
            if (firstActive) {
              void api.revealAlarm(firstActive.id).then((r) => startRingingWithSudoku(r)).catch(() => startRingingWithSudoku(null));
            } else {
              void startRingingWithSudoku(null);
            }
          }}
          style={[styles.triggerButton, { backgroundColor: c.accentBg, borderColor: c.accent }]}
        >
          <Text style={[styles.triggerText, { color: c.accent }]}>▶ Trigger alarm & test Sudoku now</Text>
        </Pressable>
      </ScrollView>

      {!!notice && <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{notice}</Text></View>}

      {/* Ringing 4x4 Sudoku Modal */}
      <Modal visible={ringing} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={styles.ringScrim}>
          <View style={styles.ringDialog}>
            <Text style={styles.ringKicker}>WAKE UP CALL</Text>
            <Text style={styles.ringTitle}>Good morning.</Text>
            <Text style={styles.ringCopy}>Silence is earned. Complete the grid.</Text>
            {ringReveal && (
              <Text style={{ color: '#FF8A79', fontSize: 11, fontWeight: '700', marginBottom: 12 }}>
                Surprise! You were woken by {ringReveal.utc_offset} {ringReveal.effective_timezone}
              </Text>
            )}
            <View style={styles.sudoku}>
              {grid.map((value, i) => (
                <Pressable
                  key={i}
                  onPress={() => setActiveCell(i)}
                  style={[
                    styles.sudokuCell,
                    {
                      borderColor: i % 4 === 1 ? '#697281' : '#353A44',
                      borderRightWidth: i % 2 === 1 ? 2 : 1,
                      borderBottomWidth: i > 7 ? 2 : 1,
                      backgroundColor: activeCell === i ? '#243A58' : '#191D24',
                    },
                  ]}
                >
                  <Text style={{ color: puzzleMask[i] !== 0 ? '#F4F6F9' : '#91B1FF', fontSize: 21, fontWeight: '700' }}>
                    {value || ''}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.numRow}>
              {[1, 2, 3, 4].map((n) => (
                <Pressable key={n} onPress={() => { void enterDigit(n); }} style={styles.numKey}>
                  <Text style={styles.numText}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sudokuHint}>Every row. Every column. Every box.</Text>
            {ringStartedAt && now - ringStartedAt > 30000 && (
              <Pressable onPress={() => setRinging(false)} style={{ alignSelf: 'center', padding: 5, marginTop: 10 }}>
                <Text style={{ color: '#888', fontSize: 10 }}>I give up, I&apos;m awake</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40 },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '800', marginTop: 5, marginBottom: 24 },
  card: { minHeight: 92, borderRadius: 20, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  cardCopy: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSubtitle: { fontSize: 12, marginTop: 4 },
  deleteBtn: { marginLeft: 10, padding: 8 },
  triggerButton: { marginTop: 18, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  triggerText: { fontSize: 14, fontWeight: '800' },
  toast: { position: 'absolute', bottom: 20, left: 18, right: 18, backgroundColor: '#252932', borderRadius: 12, padding: 13, elevation: 9 },
  toastText: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  ringScrim: { flex: 1, backgroundColor: '#07090DEB', justifyContent: 'center', padding: 22 },
  ringDialog: { backgroundColor: '#10141B', borderRadius: 24, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#303844' },
  ringKicker: { color: '#FF8A79', fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  ringTitle: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', marginTop: 5 },
  ringCopy: { color: '#ABB3C0', fontSize: 13, marginTop: 6, marginBottom: 18 },
  sudoku: { width: 240, height: 240, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: '#697281' },
  sudokuCell: { width: '25%', height: '25%', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  numRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  numKey: { width: 48, height: 42, backgroundColor: '#26364F', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  numText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  sudokuHint: { color: '#798392', fontSize: 10, marginTop: 12 },
});