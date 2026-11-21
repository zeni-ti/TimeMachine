import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { useAlarms } from '../../context/AlarmContext';
import { useSession } from '../../context/SessionContext';
import { useTheme } from '../../context/ThemeContext';
import { api, type BackendAlarm, type RevealResponse } from '../../services/api';

const EMPTY_PUZZLE = Array<number>(16).fill(0);
let lastFallbackPuzzle = '';

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function generateFallbackSudoku() {
  const base = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];
  let generated: { puzzle: number[]; solution: number[] } | undefined;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const rows = [0, 1, 2, 3];
    const columns = [0, 1, 2, 3];
    const swap = (values: number[], left: number, right: number) => {
      [values[left], values[right]] = [values[right], values[left]];
    };
    if (Math.random() < 0.5) swap(rows, 0, 1);
    if (Math.random() < 0.5) swap(rows, 2, 3);
    if (Math.random() < 0.5) { swap(rows, 0, 2); swap(rows, 1, 3); }
    if (Math.random() < 0.5) swap(columns, 0, 1);
    if (Math.random() < 0.5) swap(columns, 2, 3);
    if (Math.random() < 0.5) { swap(columns, 0, 2); swap(columns, 1, 3); }
    const digits = shuffled([1, 2, 3, 4]);
    let solution = rows.map((row) => columns.map((column) => digits[base[row][column] - 1]));
    if (Math.random() < 0.5) solution = solution[0].map((_, column) => solution.map((row) => row[column]));

    const puzzle = solution.flat();
    for (const index of shuffled([...Array(16).keys()]).slice(0, 6)) puzzle[index] = 0;
    const signature = puzzle.join('');
    generated = { puzzle, solution: solution.flat() };
    if (signature !== lastFallbackPuzzle) {
      lastFallbackPuzzle = signature;
      return generated;
    }
  }
  return generated!;
}
const CONFIRM_PROMPTS = [
  'Are you sure you want to change this alarm?',
  'Are you REALLY sure? Waking up is a big commitment.',
  "Final check: Do you solemnly swear you won't snooze this?",
];

function isValidSudoku(values: number[]) {
  const required = new Set([1, 2, 3, 4]);
  const rows = Array.from({ length: 4 }, (_, row) => values.slice(row * 4, row * 4 + 4));
  const columns = Array.from({ length: 4 }, (_, col) => [0, 1, 2, 3].map((row) => values[row * 4 + col]));
  const boxes = [0, 1, 2, 3].map((box) => {
    const rowStart = Math.floor(box / 2) * 2;
    const colStart = (box % 2) * 2;
    return [0, 1, 2, 3].map((offset) => values[(rowStart + Math.floor(offset / 2)) * 4 + colStart + offset % 2]);
  });
  return [...rows, ...columns, ...boxes].every((group) => group.length === 4 && new Set(group).size === 4 && group.every((value) => required.has(value)));
}

type PendingAction = { alarm: BackendAlarm; kind: 'toggle' | 'delete' };

export default function AlarmsScreen() {
  const { dark, toggleTheme } = useTheme();
  const { alarms, refreshAlarms, revealedMap, setRevealedMap, removeAlarm } = useAlarms();
  const { seconds, setSeconds } = useSession();
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<{ step: number; action: PendingAction } | null>(null);
  const [buttonSwap, setButtonSwap] = useState(false);

  const [ringing, setRinging] = useState(false);
  const [sudokuId, setSudokuId] = useState<string | null>(null);
  const [puzzleMask, setPuzzleMask] = useState<number[]>(EMPTY_PUZZLE);
  const [grid, setGrid] = useState<number[]>(EMPTY_PUZZLE);
  const [fallbackSolution, setFallbackSolution] = useState<number[]>([]);
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

  useEffect(() => {
    void refreshAlarms().catch(() => showToast('Backend offline. Saved alarms could not be refreshed.'));
  }, [refreshAlarms, showToast]);

  const startRingingWithSudoku = useCallback(async (reveal: RevealResponse | null) => {
    setRingReveal(reveal);
    setRingStartedAt(Date.now());
    setActiveCell(null);
    setRinging(true);
    try {
      const challenge = await api.getSudoku(6);
      const values = challenge.puzzle.flat().map((value) => value ?? 0);
      setSudokuId(challenge.challenge_id);
      setPuzzleMask(values);
      setGrid(values);
      setFallbackSolution([]);
    } catch {
      const fallback = generateFallbackSudoku();
      setSudokuId(null);
      setPuzzleMask(fallback.puzzle);
      setGrid(fallback.puzzle);
      setFallbackSolution(fallback.solution);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentMs = Date.now();
      alarms.forEach((alarm) => {
        if (!alarm.is_enabled || !alarm.next_trigger_utc || revealedMap[alarm.id]) return;
        if (currentMs >= new Date(alarm.next_trigger_utc).getTime()) {
          void (async () => {
            try {
              const reveal = await api.revealAlarm(alarm.id);
              setRevealedMap((previous) => ({ ...previous, [alarm.id]: reveal }));
              await api.toggleAlarm(alarm.id);
              await refreshAlarms();
              await startRingingWithSudoku(reveal);
            } catch {
              await startRingingWithSudoku(null);
            }
          })();
        }
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [alarms, revealedMap, refreshAlarms, setRevealedMap, startRingingWithSudoku]);

  useEffect(() => {
    if (!ringing) return;
    const player = createAudioPlayer(require('../../../assets/alarm.mp3'));
    player.loop = true;
    player.volume = 0.35;
    player.play();
    return () => {
      player.pause();
      player.remove();
    };
  }, [ringing]);

  const beginConfirm = (action: PendingAction) => {
    setConfirm({ step: 0, action });
    setButtonSwap((value) => !value);
  };

  const confirmNext = async () => {
    if (!confirm) return;
    if (confirm.step < CONFIRM_PROMPTS.length - 1) {
      setConfirm({ ...confirm, step: confirm.step + 1 });
      setButtonSwap((value) => !value);
      return;
    }
    const { action } = confirm;
    setConfirm(null);
    try {
      if (action.kind === 'toggle') await api.toggleAlarm(action.alarm.id);
      else {
        await api.deleteAlarm(action.alarm.id);
        removeAlarm(action.alarm.id);
      }
      await refreshAlarms();
      showToast(action.kind === 'delete' ? 'Alarm deleted.' : 'Alarm status updated.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update alarm.');
    }
  };

  const enterDigit = async (value: number) => {
    if (activeCell === null || puzzleMask[activeCell] !== 0) {
      showToast('Choose an empty square first.', 1500);
      return;
    }
    const next = [...grid];
    next[activeCell] = value;
    setGrid(next);
    const nextEmpty = next.findIndex((cell, index) => cell === 0 && puzzleMask[index] === 0);
    setActiveCell(nextEmpty < 0 ? null : nextEmpty);

    if (!next.includes(0)) {
      if (!isValidSudoku(next)) {
        showToast('Not quite. Check every row, column, and 2×2 box.');
        return;
      }
      if (sudokuId) {
        try {
          const result = await api.verifySudoku(sudokuId, [next.slice(0, 4), next.slice(4, 8), next.slice(8, 12), next.slice(12, 16)]);
          if (result.passed) {
            setRinging(false);
            showToast(result.message);
          } else showToast(result.message || 'That grid is valid, but it is not this puzzle’s solution.');
          return;
        } catch {
          // The local checks above match the server's row, column, box, and fixed-clue rules.
          setRinging(false);
          showToast('Sudoku solved. The alarm is quiet. For now.');
          return;
        }
      }
      if (next.every((cell, index) => cell === fallbackSolution[index])) {
        setRinging(false);
        showToast('Sudoku solved. The alarm is quiet. For now.');
      } else showToast('That grid is valid, but it is not this puzzle’s solution.');
    }
  };

  const clearActiveCell = () => {
    if (activeCell === null || puzzleMask[activeCell] !== 0) return;
    setGrid((current) => current.map((value, index) => index === activeCell ? 0 : value));
  };

  const elapsedSeconds = ringStartedAt === null ? 0 : Math.floor((now - ringStartedAt) / 1000);
  const btn = (label: string, onPress: () => void, primary = false, danger = false) => (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor: primary ? c.accent : c.card, borderColor: danger ? c.red : primary ? c.accent : c.line }]}>
      <Text style={{ color: primary ? '#FFFFFF' : danger ? c.red : c.fg, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, backgroundColor: c.bg }} onTouchEnd={toggleTheme}>
        <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
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
            <View><Text style={[styles.title, { color: c.fg }]}>Alarms</Text><Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>Scheduled alarms. Accuracy may vary.</Text></View>
            <Text style={[styles.count, { color: c.accent }]}>{String(alarms.length).padStart(2, '0')}</Text>
          </View>

          {alarms.length === 0
            ? <View style={[styles.empty, { backgroundColor: c.card, borderColor: c.line }]}><Text style={{ color: c.accent, fontSize: 29, marginRight: 14 }}>◷</Text><View><Text style={{ color: c.fg, fontWeight: '800', fontSize: 14 }}>No alarms. How peaceful.</Text><Text style={{ color: c.muted, fontSize: 11, marginTop: 5 }}>Set one from Today. We&apos;ll make it complicated.</Text></View></View>
            : alarms.map((alarm) => {
              const revealed = revealedMap[alarm.id];
              return (
                <View key={alarm.id} style={[styles.alarmCard, { backgroundColor: c.card, borderColor: c.line }]}>
                  <View style={styles.alarmHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.time, { color: c.fg }]}>{alarm.target_time}</Text>
                      <Text style={{ color: alarm.is_enabled ? c.accent : c.muted, fontSize: 10, fontWeight: '800', marginTop: 3 }}>{alarm.is_enabled ? 'ARMED' : 'PAUSED'}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: alarm.is_enabled ? c.accent : c.muted }]} />
                  </View>
                  <Text style={{ color: c.muted, fontSize: 12, marginTop: 9 }}>{alarm.is_enabled ? `${alarm.display_timezone} (auto)` : 'Paused'}</Text>
                  {revealed && <Text style={{ color: c.muted, opacity: 0.7, fontSize: 9, marginTop: 6 }}>Actually rang in {revealed.utc_offset} {revealed.effective_timezone}</Text>}
                  <View style={styles.actions}>
                    {btn(alarm.is_enabled ? 'Turn off' : 'Turn on', () => beginConfirm({ alarm, kind: 'toggle' }), alarm.is_enabled)}
                    {btn('Delete', () => beginConfirm({ alarm, kind: 'delete' }), false, true)}
                  </View>
                </View>
              );
            })}

          {btn('Trigger alarm now', () => {
            const active = alarms.find((alarm) => alarm.is_enabled);
            if (active) void api.revealAlarm(active.id).then((reveal) => startRingingWithSudoku(reveal)).catch(() => startRingingWithSudoku(null));
            else void startRingingWithSudoku(null);
          }, true)}
          <Text style={[styles.footer, { color: c.muted }]}>TIME IS A SUGGESTION.</Text>
        </ScrollView>

        {!!notice && <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{notice}</Text></View>}

        <Modal visible={ringing} transparent animationType="fade" onRequestClose={() => {}}>
          <View style={styles.ringScrim}>
            <View style={[styles.ringDialog, { backgroundColor: c.card, borderColor: c.line }]}>
              <Text style={[styles.ringKicker, { color: c.red }]}>ALARM RINGING</Text>
              <Text style={[styles.ringTitle, { color: c.fg }]}>Wake up.</Text>
              <Text style={[styles.ringCopy, { color: c.muted }]}>Fill each row, column, and 2×2 box with 1–4.</Text>
              {ringReveal && <Text style={styles.reveal}>{ringReveal.utc_offset} {ringReveal.effective_timezone}</Text>}
              <View style={styles.sudoku}>
                {grid.map((value, index) => {
                  const fixed = puzzleMask[index] !== 0;
                  const selected = activeCell === index;
                  return (
                    <Pressable
                      key={index}
                      disabled={fixed}
                      onPress={() => setActiveCell(index)}
                      style={[
                        styles.sudokuCell,
                        { backgroundColor: selected ? c.accentBg : fixed ? (dark ? '#22242A' : '#E9EDF4') : c.bg, borderColor: c.line },
                        { borderRightWidth: index % 4 === 1 ? 2 : 1, borderBottomWidth: Math.floor(index / 4) === 1 ? 2 : 1 },
                      ]}
                    >
                      <Text style={{ color: fixed ? c.muted : selected ? c.accent : c.fg, fontSize: 24, fontWeight: fixed ? '700' : '600' }}>{value || ''}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.selectionHint, { color: c.muted }]}>{activeCell === null ? 'Select an empty square, then enter a number.' : `Selected square ${activeCell + 1}.`}</Text>
              <View style={styles.numberPad}>
                {[1, 2, 3, 4].map((value) => (
                  <Pressable key={value} onPress={() => { void enterDigit(value); }} style={[styles.numberKey, { backgroundColor: c.accentBg, borderColor: c.line }]}>
                    <Text style={{ color: c.accent, fontSize: 19, fontWeight: '800' }}>{value}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={clearActiveCell} style={[styles.clearKey, { borderColor: c.line }]}><Text style={{ color: c.muted, fontWeight: '700' }}>Clear</Text></Pressable>
              </View>
              {elapsedSeconds >= 30 && (
                <Pressable onPress={() => { setRinging(false); showToast('Override accepted. You are technically awake.'); }} hitSlop={10} style={styles.override}>
                  <Text style={{ color: c.muted, opacity: 0.48, fontSize: 10 }}>I give up, I&apos;m awake</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
          <View style={styles.ringScrim} onTouchEnd={toggleTheme}>
            <View style={[styles.confirmDialog, { backgroundColor: c.card }]}>
              <Text style={[styles.confirmKicker, { color: c.accent }]}>CONFIRMATION {String((confirm?.step ?? 0) + 1).padStart(2, '0')} / 03</Text>
              <Text style={[styles.confirmTitle, { color: c.fg }]}>{CONFIRM_PROMPTS[confirm?.step ?? 0]}</Text>
              <View style={[styles.actions, { flexDirection: buttonSwap ? 'row-reverse' : 'row' }]}>
                {btn('Go back', () => { setConfirm(null); setSeconds((value) => Math.max(0, value - 5)); showToast('Wrong choice. Five seconds, please.'); })}
                {btn(confirm?.step === CONFIRM_PROMPTS.length - 1 ? 'I accept' : 'Confirm', () => { void confirmNext(); }, true)}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageContent: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { fontSize: 9, letterSpacing: 1.2, fontWeight: '700', marginTop: 4 },
  session: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center', minWidth: 91 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 15 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.7 },
  count: { fontSize: 27, fontWeight: '800', fontVariant: ['tabular-nums'] },
  empty: { minHeight: 88, borderWidth: 1, borderRadius: 17, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  alarmCard: { borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 11 },
  alarmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  button: { minHeight: 46, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flex: 1, marginTop: 12 },
  footer: { textAlign: 'center', marginTop: 23, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  toast: { position: 'absolute', bottom: 18, left: 18, right: 18, backgroundColor: '#252932', borderRadius: 12, padding: 13, elevation: 9 },
  toastText: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  ringScrim: { flex: 1, backgroundColor: '#080B12E8', justifyContent: 'center', padding: 16 },
  ringDialog: { borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, width: '100%', maxWidth: 390, alignSelf: 'center' },
  ringKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  ringTitle: { fontSize: 30, fontWeight: '900', marginTop: 4 },
  ringCopy: { fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 11 },
  reveal: { color: '#A0A7B4', opacity: 0.55, fontSize: 9, marginBottom: 8 },
  sudoku: { width: 264, height: 264, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: '#697281', borderRadius: 4, overflow: 'hidden' },
  sudokuCell: { width: '25%', height: '25%', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  selectionHint: { fontSize: 10, marginTop: 9, minHeight: 14, textAlign: 'center' },
  numberPad: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' },
  numberKey: { width: 48, height: 44, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  clearKey: { minWidth: 64, height: 44, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  override: { marginTop: 12, padding: 5 },
  confirmDialog: { borderRadius: 22, padding: 20, maxWidth: 460, width: '100%', alignSelf: 'center' },
  confirmKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  confirmTitle: { fontSize: 20, fontWeight: '800', lineHeight: 27, marginTop: 8 },
});
