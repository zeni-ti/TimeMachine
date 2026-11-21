import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch } from '../../components/Switch';
import { useTheme } from '../../context/ThemeContext';
import { createAudioPlayer } from 'expo-audio';
import { api, type BackendAlarm, type RevealResponse } from '../../services/api';

const FALLBACK_SOLUTION = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
const FALLBACK_PUZZLE = [1, 0, 3, 0, 0, 4, 0, 2, 2, 0, 4, 0, 0, 3, 0, 1];

export default function AlertsScreen() {
  const { dark } = useTheme();
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [revealedMap, setRevealedMap] = useState<Record<string, RevealResponse>>({});
  const [notice, setNotice] = useState('');
  
  const [ringing, setRinging] = useState(false);
  const [_sudokuId, setSudokuId] = useState<string | null>(null); // Prefix _ for unused
  const [puzzleMask, setPuzzleMask] = useState<number[]>(FALLBACK_PUZZLE);
  const [grid, setGrid] = useState<number[]>(FALLBACK_PUZZLE);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [ringReveal, setRingReveal] = useState<RevealResponse | null>(null);

  const c = dark
    ? { bg: '#09090B', fg: '#FAFAFA', muted: '#9696A0', card: '#17171B', line: '#2B2B30', accent: '#93B4FF', accentBg: '#17213A', red: '#FF7777' }
    : { bg: '#F5F7FA', fg: '#191B20', muted: '#747984', card: '#FFFFFF', line: '#E6E8ED', accent: '#315FEA', accentBg: '#EEF2FF', red: '#D85656' };

  const showToast = useCallback((msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 2600); }, []);

  const loadAlarms = useCallback(async () => {
    try { const data = await api.listAlarms(); setAlarms(data.alarms); } catch { showToast('Backend offline.'); }
  }, [showToast]);

  // FIX: Isolated fetch logic within useEffect to avoid setState sync warnings
  useEffect(() => {
    let active = true;
    const fetch = async () => {
        try { const data = await api.listAlarms(); if(active) setAlarms(data.alarms); } 
        catch { if(active) showToast('Backend offline.'); }
    };
    void fetch();
    return () => { active = false; };
  }, [showToast]);

  const startRingingWithSudoku = useCallback(async (reveal: RevealResponse | null) => {
    setRingReveal(reveal); setActiveCell(null); setRinging(true);
    try {
      const s = await api.getSudoku();
      const flat = s.puzzle.flat().map((v) => v ?? 0);
      setSudokuId(s.challenge_id); setPuzzleMask(flat); setGrid(flat);
    } catch { setSudokuId(null); setPuzzleMask(FALLBACK_PUZZLE); setGrid(FALLBACK_PUZZLE); }
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      const currentMs = Date.now();
      alarms.forEach((alarm) => {
        if (!alarm.is_enabled || !alarm.next_trigger_utc || revealedMap[alarm.id]) return;
        if (currentMs >= new Date(alarm.next_trigger_utc).getTime()) {
          void (async () => {
            try {
              const reveal = await api.revealAlarm(alarm.id);
              setRevealedMap(prev => ({ ...prev, [alarm.id]: reveal }));
              await api.toggleAlarm(alarm.id);
              await loadAlarms();
              await startRingingWithSudoku(reveal);
            } catch { await startRingingWithSudoku(null); }
          })();
        }
      });
    }, 5000);
    return () => clearInterval(tick);
  }, [alarms, revealedMap, loadAlarms, startRingingWithSudoku]);

  useEffect(() => {
    if (!ringing) return;
    const player = createAudioPlayer(require('../../../assets/alarm.mp3'));
    player.loop = true; player.volume = 0.5; player.play();
    return () => { player.pause(); player.remove(); };
  }, [ringing]);

  const enterDigit = (value: number) => {
    if (activeCell === null || puzzleMask[activeCell] !== 0) return;
    const next = [...grid]; next[activeCell] = value; setGrid(next);
    if (next.every((n) => n !== 0)) {
        if (next.every((n, i) => n === FALLBACK_SOLUTION[i])) setRinging(false);
        else showToast('Incorrect solution!');
    }
  };

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.fg }]}>Scheduled Alarms</Text>
        {alarms.map((alarm) => (
          <View key={alarm.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
            <View style={[styles.icon, { backgroundColor: c.accentBg }]}><Text style={styles.iconText}>⏰</Text></View>
            <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: c.fg }]}>{alarm.target_time}</Text>
                {revealedMap[alarm.id] && <Text style={{color: c.red, fontSize: 10}}>⚠️ {revealedMap[alarm.id].effective_timezone}</Text>}
            </View>
            <Switch value={alarm.is_enabled} onChange={() => api.toggleAlarm(alarm.id).then(loadAlarms)} />
            <Pressable onPress={() => api.deleteAlarm(alarm.id).then(loadAlarms)} style={styles.deleteBtn}><Text style={{color: c.red}}>✕</Text></Pressable>
          </View>
        ))}
        <Pressable onPress={() => {
            const active = alarms.find(a => a.is_enabled);
            if(active) api.revealAlarm(active.id).then(r => startRingingWithSudoku(r)).catch(() => startRingingWithSudoku(null));
            else startRingingWithSudoku(null);
        }} style={[styles.triggerButton, { borderColor: c.accent }]}><Text style={[styles.triggerText, { color: c.accent }]}>▶ Trigger Alarm Now</Text></Pressable>
      </ScrollView>

      {!!notice && <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{notice}</Text></View>}

      <Modal visible={ringing} transparent animationType="slide">
        <View style={styles.ringScrim}>
            <View style={[styles.ringDialog, { backgroundColor: c.card }]}>
                <Text style={[styles.ringTitle, { color: c.fg }]}>WAKE UP</Text>
                {ringReveal && <Text style={{color: c.muted, fontSize: 10}}>Waking from {ringReveal.effective_timezone}</Text>}
                <View style={styles.sudoku}>
                    {grid.map((v, i) => (
                        <Pressable key={i} onPress={() => setActiveCell(i)} style={[styles.sudokuCell, { backgroundColor: activeCell === i ? c.accentBg : c.bg }]}>
                            <Text style={{color: c.fg, fontSize: 20}}>{v || ''}</Text>
                        </Pressable>
                    ))}
                </View>
                <View style={styles.numRow}>{[1,2,3,4].map(n => <Pressable key={n} onPress={() => enterDigit(n)} style={styles.numKey}><Text style={{color: c.fg}}>{n}</Text></Pressable>)}</View>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 }, content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', marginTop: 5, marginBottom: 24 },
  card: { minHeight: 92, borderRadius: 20, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 }, cardCopy: { flex: 1, marginLeft: 12 }, cardTitle: { fontSize: 15, fontWeight: '800' },
  deleteBtn: { marginLeft: 10, padding: 8 }, triggerButton: { marginTop: 18, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  triggerText: { fontSize: 14, fontWeight: '800' }, toast: { position: 'absolute', bottom: 20, left: 18, right: 18, backgroundColor: '#252932', borderRadius: 12, padding: 13, elevation: 9 },
  toastText: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', fontWeight: '600' }, ringScrim: { flex: 1, backgroundColor: '#07090DEB', justifyContent: 'center', padding: 22 },
  ringDialog: { borderRadius: 24, padding: 22, alignItems: 'center', borderWidth: 1 }, ringTitle: { fontSize: 31, fontWeight: '900', marginTop: 5 },
  sudoku: { width: 240, height: 240, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: '#697281' }, sudokuCell: { width: '25%', height: '25%', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  numRow: { flexDirection: 'row', gap: 10, marginTop: 15 }, numKey: { width: 48, height: 42, backgroundColor: '#26364F', borderRadius: 10, justifyContent: 'center', alignItems: 'center' }
});