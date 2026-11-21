import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useSplash } from '../../context/SplashContext';
import { getRandomZone, useAlarms, Zone } from '../../context/AlarmContext';
import { useSession } from '../../context/SessionContext';

const CAPTCHA_TILES = ['🍌', '📎', '☁️', '🧦', '🪴', '📚', '🧃', '🪑', '🧤'];
const SOLUTION = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
const PUZZLE = [1, 0, 3, 0, 0, 4, 0, 2, 2, 0, 4, 0, 0, 3, 0, 1];
const PROMPTS = [
  'Are you sure you want to set this alarm?',
  'Are you REALLY sure? Waking up is a big commitment.',
  "Final check: Do you solemnly swear you won't snooze this?",
];
const SNOOZE_TAX_STORAGE_KEY = 'timemachine:snooze-tax';
const INITIAL_SNOOZE_TAX = (() => {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') return 0;
  try {
    const saved = Number.parseInt(globalThis.localStorage.getItem(SNOOZE_TAX_STORAGE_KEY) ?? '0', 10);
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch { return 0; }
})();

export default function TodayScreen() {
  const { dark, toggleTheme } = useTheme();
  const { splashVisible } = useSplash();
  const { setAlarms } = useAlarms();
  const { seconds, setSeconds } = useSession();
  const [now, setNow] = useState(0);
  const [hour, setHour] = useState('07');
  const [minute, setMinute] = useState('30');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [periodCommitted, setPeriodCommitted] = useState(false);
  const [editPart, setEditPart] = useState<'hour' | 'minute' | null>(null);
  const [calcBuffer, setCalcBuffer] = useState('');
  const [snoozeTax, setSnoozeTax] = useState(INITIAL_SNOOZE_TAX);
  const [captcha, setCaptcha] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<{ step: number; required: number; action: () => void } | null>(null);
  const [buttonSwap, setButtonSwap] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [grid, setGrid] = useState<number[]>(PUZZLE);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [ringZone, setRingZone] = useState<Zone | null>(null);
  const [ringPeriod, setRingPeriod] = useState<'AM' | 'PM' | null>(null);
  const [ringStartedAt, setRingStartedAt] = useState<number | null>(null);
  const audioRef = useRef<{ close?: () => void } | null>(null);
  const c = dark ? { bg: '#09090B', fg: '#FAFAFA', muted: '#9696A0', card: '#17171B', line: '#2B2B30', accent: '#93B4FF', accentBg: '#17213A', red: '#FF7777', hero: '#171B24' } : { bg: '#F5F7FA', fg: '#191B20', muted: '#747984', card: '#FFFFFF', line: '#E6E8ED', accent: '#315FEA', accentBg: '#EEF2FF', red: '#D85656', hero: '#17283C' };

  const mistake = useCallback((message: string) => {
    setSeconds((value) => Math.max(0, value - 5));
    setNotice(message);
    setTimeout(() => setNotice(''), 2600);
  }, [setSeconds]);

  useEffect(() => {
    if (splashVisible) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (seconds <= 1) {
        setHour('07'); setMinute('30'); setPeriod('AM'); setPeriodCommitted(false); setEditPart(null); setCalcBuffer('');
        setNotice(`Session expired! Your alarm draft was wiped, but your Snooze Tax of ${snoozeTax} carried over.`);
        setTimeout(() => setNotice(''), 3500);
        setSeconds(45);
      } else { setSeconds(seconds - 1); }
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds, snoozeTax, splashVisible, setSeconds]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') return;
    try { globalThis.localStorage.setItem(SNOOZE_TAX_STORAGE_KEY, String(snoozeTax)); } catch { /* Storage may be unavailable in private browsing. */ }
  }, [snoozeTax]);

  useEffect(() => {
    const tick = setInterval(() => {
      const date = new Date();
      const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
      setAlarms((items) => items.map((alarm) => {
        if (!alarm.enabled || alarm.revealed) return alarm;
        const offsetMinutes = alarm.zone.offset * 60;
        const zoneMinutes = ((utcMinutes + offsetMinutes) % 1440 + 1440) % 1440;
        const hour24 = (alarm.hour % 12) + (alarm.period === 'PM' ? 12 : 0);
        if (zoneMinutes === hour24 * 60 + alarm.minute) {
          setRingZone(alarm.zone); setRingPeriod(alarm.period); setRingStartedAt(Date.now()); setRinging(true);
          return { ...alarm, revealed: true, enabled: false };
        }
        return alarm;
      }));
    }, 15000);
    return () => clearInterval(tick);
  }, [setAlarms]);

  useEffect(() => {
    if (!ringing) { audioRef.current?.close?.(); audioRef.current = null; return; }
    const g = globalThis as typeof globalThis & { AudioContext?: new () => any; webkitAudioContext?: new () => any };
    const AudioCtor = g.AudioContext ?? g.webkitAudioContext;
    if (AudioCtor) {
      try {
        const ctx = new AudioCtor(); audioRef.current = ctx;
        let step = 0;
        const play = () => {
          if (ctx.state === 'suspended') void ctx.resume();
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'square'; osc.frequency.value = step++ % 2 ? 740 : 520;
          gain.gain.value = 0.035; osc.connect(gain); gain.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 0.16);
        };
        play(); const id = setInterval(play, 420);
        return () => { clearInterval(id); void ctx.close(); audioRef.current = null; };
      } catch { /* Audio is unavailable in some native runtimes; the visual alarm remains usable. */ }
    }
  }, [ringing]);

  const openCaptcha = () => {
    if (!editPart) { mistake('Select H or M before continuing. The display is locked.'); return; }
    setPeriodCommitted(true);
    setCaptcha(true); setSelected([]); setAttempts(0);
  };
  const beginConfirm = (action: () => void, extraConfirmations = 0) => { setConfirm({ step: 0, required: 3 + extraConfirmations, action }); setButtonSwap((value) => !value); };
  const confirmNext = () => {
    if (!confirm) return;
    if (confirm.step < confirm.required - 1) { setButtonSwap((value) => !value); setConfirm({ ...confirm, step: confirm.step + 1 }); }
    else { confirm.action(); setConfirm(null); }
  };
  const createAlarm = () => {
    const h = Math.max(0, Math.min(12, Number(hour) || 0));
    const m = Math.max(0, Math.min(59, Number(minute) || 0));
    const alarmPeriod = period;
    const zone = getRandomZone();
    setHour(String(h).padStart(2, '0')); setMinute(String(m).padStart(2, '0'));
    const extraConfirmations = snoozeTax;
    beginConfirm(() => {
      setAlarms((items) => [...items, { id: Date.now(), hour: h, minute: m, period: alarmPeriod, zone, enabled: true, revealed: false, extraConfirmations }]);
      if (extraConfirmations > 0) {
        setSnoozeTax(0);
        setNotice('Snooze Tax paid in full. For now.'); setTimeout(() => setNotice(''), 3000);
      }
    }, extraConfirmations);
  };
  const chooseTimePart = (part: 'hour' | 'minute') => { setEditPart(part); setCalcBuffer(''); setPeriodCommitted(false); };
  const setTimePart = (value: string) => {
    if (!editPart) { mistake('Choose H or M first. The keypad cannot read your mind.'); return; }
    const max = editPart === 'hour' ? 12 : 59;
    const numeric = Number(value) || 0;
    const wrapped = numeric > max;
    const normalized = String(numeric % (max + 1)).padStart(2, '0');
    if (editPart === 'hour') setHour(normalized); else setMinute(normalized);
    setPeriodCommitted(false);
    setAlarms((items) => items.map((alarm) => ({ ...alarm, zone: getRandomZone() })));
    if (wrapped) mistake(`${numeric} wrapped around to ${normalized}. Time is a circle.`);
  };
  const pressDigit = (digit: string) => {
    if (!editPart) { mistake('Press H or M before entering digits. The calculator insists.'); return; }
    const next = `${calcBuffer}${digit}`.slice(-2);
    setCalcBuffer(next);
    setTimePart(next);
  };
  const pressOperator = (operator: string) => {
    if (operator === 'AC') {
      if (Platform.OS === 'android') BackHandler.exitApp();
      else { setNotice('AC tried to leave. Use your device controls to exit.'); setTimeout(() => setNotice(''), 2600); }
    }
    else if (operator === '%') {
      let deleted = false;
      if (editPart) {
        const fieldValue = editPart === 'hour' ? hour : minute;
        const currentDigits = calcBuffer || fieldValue;
        if (calcBuffer.length > 0 || fieldValue !== '00') {
          const next = currentDigits.slice(0, -1);
          setCalcBuffer(next);
          setTimePart(next || '0');
          deleted = true;
        }
      }
      setSnoozeTax((value) => value + 1);
      setNotice(deleted ? 'Typo detected. Deleting a digit costs +1 Snooze Tax.' : 'Nothing to delete, charged you +1 Snooze Tax anyway.');
      setTimeout(() => setNotice(''), 2600);
    }
    else if (operator === 'DEL') {
      if (!editPart) { mistake('Select H or M before deleting. Nothing is safe.'); return; }
      const next = calcBuffer.slice(0, -1); setCalcBuffer(next); setTimePart(next || '0');
    }
    else if (operator === '×') {
      setHour('00'); setMinute('00'); setPeriod('AM'); setPeriodCommitted(false); setCalcBuffer(''); setEditPart(null);
      setSnoozeTax((value) => value + 1);
      setNotice("Time cleared. Your emotional baggage (and Snooze Tax) remains—plus +1 Indecision Fee."); setTimeout(() => setNotice(''), 2600);
    }
    else if (operator === 'H') chooseTimePart('hour');
    else if (operator === 'M') chooseTimePart('minute');
    else if (operator === '=') openCaptcha();
    else if (operator === '±') {
      const next = period === 'AM' ? 'PM' : 'AM';
      setPeriod(next); setPeriodCommitted(false); setNotice(`Polarity set to ${next}.`); setTimeout(() => setNotice(''), 2600);
    }
    else if (operator === '+') {
      const offsets = [13, 47, 120];
      const added = offsets[snoozeTax % offsets.length];
      const hour24 = (Number(hour) % 12) + (period === 'PM' ? 12 : 0);
      const total = (hour24 * 60 + Number(minute) + added) % 1440;
      const nextHour24 = Math.floor(total / 60);
      setHour(String(nextHour24 % 12 || 12).padStart(2, '0')); setMinute(String(total % 60).padStart(2, '0'));
      setPeriod(nextHour24 >= 12 ? 'PM' : 'AM'); setPeriodCommitted(false);
      setAlarms((items) => items.map((alarm) => ({ ...alarm, zone: getRandomZone() })));
      setSnoozeTax((value) => value + 1); setCalcBuffer('');
      setNotice(`Chaos added +${added >= 60 ? `${added / 60}h` : `${added}m`}. Snooze tax +1.`); setTimeout(() => setNotice(''), 2600);
    }
    else { mistake(`${operator} applied to your morning. Somehow.`); setCalcBuffer(''); }
  };
  const resetDemoDebt = () => {
    setSnoozeTax(0);
    setAlarms((items) => items.map((alarm) => ({ ...alarm, extraConfirmations: 0 })));
    if (Platform.OS === 'web' && typeof globalThis.localStorage !== 'undefined') {
      try { globalThis.localStorage.removeItem(SNOOZE_TAX_STORAGE_KEY); } catch { /* Storage may be unavailable in private browsing. */ }
    }
    setNotice('Demo debt forgiven. Try not to celebrate too loudly.'); setTimeout(() => setNotice(''), 2600);
  };
  const verifyCaptcha = () => {
    if (attempts >= 2) { setCaptcha(false); setNotice('Verification passed. Probably.'); createAlarm(); }
    else if (selected.length) { mistake('Please try again'); setSelected([]); setAttempts((v) => v + 1); }
    else { mistake('Please try again'); setAttempts((v) => v + 1); }
  };
  const triggerAlarm = () => { setGrid(PUZZLE); setActiveCell(null); setRingZone(null); setRingPeriod(null); setRingStartedAt(Date.now()); setRinging(true); };
  const enterDigit = (value: number) => {
    if (activeCell === null || PUZZLE[activeCell] !== 0) return;
    const next = [...grid]; next[activeCell] = value; setGrid(next);
    if (next.every((n, i) => n === SOLUTION[i])) setRinging(false);
  };
  const displayTime = now ? new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--:--';
  const btn = (label: string, onPress: () => void, primary = false, extra?: object) => (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor: primary ? c.accent : c.card, borderColor: primary ? c.accent : c.line }, extra]}>
      <Text style={{ color: primary ? '#FFFFFF' : c.fg, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, backgroundColor: c.bg }} onTouchEnd={toggleTheme}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.topLine}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: c.fg }]}>TimeMachine<Text style={{ color: c.accent }}>.</Text></Text>
              <Text style={[styles.kicker, { color: c.muted }]}>SLEEP, WITH COMPLICATIONS</Text>
            </View>
            <View style={[styles.session, { backgroundColor: c.card, borderColor: c.line }]}>
              <View style={styles.liveDot} /><Text style={{ color: c.red, fontSize: 12, fontWeight: '800' }}>00:{String(seconds).padStart(2, '0')}</Text>
              <Text style={{ color: c.muted, fontSize: 9, marginTop: 3 }}>SESSION EXPIRES</Text>
            </View>
          </View>
          <Text style={[styles.warning, { color: c.red }]}>Unsaved alarms will be wiped. Probably.</Text>

          <View style={[styles.hero, { backgroundColor: c.hero }]}>
            <View style={styles.heroHead}><Text style={styles.heroEyebrow}>YOUR LOCAL TIME</Text><View style={styles.nowPill}><View style={styles.whiteDot} /><Text style={styles.nowText}>LIVE</Text></View></View>
            <Text style={styles.bigTime}>{displayTime}</Text>
            <Text style={styles.heroSub}>Your time. Allegedly.</Text>
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.heading, { color: c.fg }]}>The alarm</Text><Text style={[styles.sectionMeta, { color: c.muted }]}>01 / CONFIGURE</Text></View>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
            <View style={styles.calcTop}>
              <View><Text style={[styles.label, { color: c.muted }]}>WAKE TIME / INPUT VALUE</Text><Text style={[styles.calcSub, { color: c.muted }]}>TARGET: {editPart ? editPart.toUpperCase() : 'NONE'} · 24H / 60M</Text></View>
              <Text style={[styles.calcMemory, { color: c.accent }]}>M+</Text>
            </View>
            <View style={[styles.calcDisplay, { backgroundColor: dark ? '#09090B' : '#F2F4F7', borderColor: c.line }]}>
              <View accessibilityLabel={`Locked hour value ${hour}`} style={[styles.calcValue, editPart === 'hour' && { borderBottomColor: c.accent, borderBottomWidth: 2 }]}><Text style={[styles.calcDigits, { color: c.fg }]}>{hour}</Text><Text style={[styles.calcUnit, { color: c.muted }]}>HRS · LOCKED</Text></View>
              <Text style={[styles.calcColon, { color: c.muted }]}>:</Text>
              <View accessibilityLabel={`Locked minute value ${minute}`} style={[styles.calcValue, editPart === 'minute' && { borderBottomColor: c.accent, borderBottomWidth: 2 }]}><Text style={[styles.calcDigits, { color: c.fg }]}>{minute}</Text><Text style={[styles.calcUnit, { color: c.muted }]}>MIN · LOCKED</Text></View>
              {editPart && !periodCommitted && <Text style={[styles.periodBadge, { color: c.accent }]}>{period}</Text>}
              <Text style={[styles.calcResult, { color: c.muted }]}>{calcBuffer || 'ANS'}</Text>
            </View>
            <View style={styles.calcGrid}>
              {[
                ['AC', '%', '÷', '×'], ['7', '8', '9', '−'], ['4', '5', '6', '+'], ['1', '2', '3', '±'], ['H', '0', 'M', '='],
              ].flat().map((key) => {
                const isDigit = /^\d$/.test(key);
                const operator = !isDigit;
                const selectedKey = key === 'H' ? editPart === 'hour' : key === 'M' ? editPart === 'minute' : false;
                const label = key === '%' ? 'Percent key, deletes last digit' : key === '×' ? 'Multiply key, clears all time' : key === '+' ? 'Plus key, adds chaos and a confirmation' : key === '±' ? 'Toggle AM or PM' : key === '=' ? 'Commit time and continue' : isDigit ? `Enter ${key}` : `Calculator key ${key}`;
                return <Pressable key={key} accessibilityLabel={label} onPress={() => isDigit ? pressDigit(key) : pressOperator(key)} style={[styles.calcKey, { backgroundColor: key === '=' ? c.accent : selectedKey ? c.accentBg : operator ? (dark ? '#22242A' : '#EDF0F5') : (dark ? '#17171B' : '#FFFFFF'), borderColor: c.line }]}><Text style={{ color: key === '=' ? '#FFFFFF' : selectedKey ? c.accent : operator ? c.accent : c.fg, fontSize: key.length > 1 ? 12 : 18, fontWeight: '700' }}>{key}</Text></Pressable>;
              })}
            </View>
            <Text style={[styles.helper, { color: c.muted }]}>{editPart ? 'H or M selects the target. Operators may have other plans.' : 'Read only. Press H or M before entering digits.'}</Text>
            <Text style={{ color: c.red, fontSize: 10, fontWeight: '800', marginTop: 6 }}>SNOOZE TAX · {snoozeTax} EXTRA CONFIRMATION{snoozeTax === 1 ? '' : 'S'}</Text>
            <View style={styles.actionRow}>
              {buttonSwap ? btn('Set alarm', () => { setHour('07'); setMinute('30'); mistake('Alarm cancelled. Form cleared.'); }, false, { borderColor: c.line, flex: 1 }) : btn('Set alarm', openCaptcha, false, { borderColor: c.line, flex: 1 })}
              {buttonSwap ? btn('Cancel', openCaptcha, true, { flex: 1 }) : btn('Cancel', () => { setHour('07'); setMinute('30'); mistake('Alarm cancelled. Form cleared.'); }, true, { flex: 1 })}
            </View>
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.heading, { color: c.fg }]}>For the judges</Text><Text style={[styles.sectionMeta, { color: c.muted }]}>02 / DEMO</Text></View>
          <Pressable onPress={triggerAlarm} style={[styles.trigger, { backgroundColor: c.accentBg, borderColor: c.accent }]}><View style={[styles.triggerIcon, { backgroundColor: c.accent }]}><Text style={{ color: '#FFF', fontSize: 18 }}>▶</Text></View><View style={{ flex: 1 }}><Text style={{ color: c.fg, fontWeight: '800', fontSize: 15 }}>Trigger alarm now</Text><Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>Test your morning resolve</Text></View><Text style={{ color: c.accent, fontSize: 20 }}>↗</Text></Pressable>
          <Text style={[styles.footer, { color: c.muted }]}>DESIGNED TO GET YOU UP. EVENTUALLY.</Text>
          <Pressable onPress={resetDemoDebt} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 10 }}><Text style={{ color: c.muted, opacity: 0.42, fontSize: 9 }}>Reset Demo Debt</Text></Pressable>
        </ScrollView>

        {!!notice && <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{notice}</Text></View>}

        <Modal visible={captcha} transparent animationType="fade" onRequestClose={() => setCaptcha(false)}>
          <View style={styles.scrim} onTouchEnd={toggleTheme}><View style={[styles.dialog, { backgroundColor: c.card }]}>
            <Text style={[styles.modalKicker, { color: c.accent }]}>SECURITY CHECK · ATTEMPT {attempts + 1}</Text><Text style={[styles.modalTitle, { color: c.fg }]}>Select all traffic lights</Text><Text style={[styles.helper, { color: c.muted, marginBottom: 15 }]}>A quick check to make sure you&apos;re awake.</Text>
            <View style={styles.tileGrid}>{CAPTCHA_TILES.map((tile, i) => <Pressable key={`${attempts}-${i}`} onPress={() => setSelected((v) => v.includes(i) ? v.filter((n) => n !== i) : [...v, i])} style={[styles.tile, { backgroundColor: c.bg, borderColor: selected.includes(i) ? c.accent : c.line }]}><Text style={{ fontSize: 26 }}>{tile}</Text></Pressable>)}</View>
            <View style={styles.actionRow}>{btn('Verify', verifyCaptcha, true, { flex: 1 })}{btn('Skip / None', () => { if (attempts >= 2) { setCaptcha(false); createAlarm(); } else { mistake('Please try again'); setAttempts((v) => v + 1); } }, false, { flex: 1 })}</View>
            <Pressable onPress={() => { setCaptcha(false); createAlarm(); }} style={{ alignSelf: 'flex-end', marginTop: 11, padding: 4 }}><Text style={{ color: c.muted, opacity: 0.32, fontSize: 9 }}>I am a robot</Text></Pressable>
          </View></View>
        </Modal>

        <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
          <View style={styles.scrim} onTouchEnd={toggleTheme}><View style={[styles.dialog, { backgroundColor: c.card }]}>
            <Text style={[styles.modalKicker, { color: c.accent }]}>CONFIRMATION {String((confirm?.step ?? 0) + 1).padStart(2, '0')} / {String(confirm?.required ?? 3).padStart(2, '0')}</Text><Text style={[styles.modalTitle, { color: c.fg }]}>{confirm && confirm.step < PROMPTS.length ? PROMPTS[confirm.step] : 'You pressed +. Please confirm your extra confirmation.'}</Text><Text style={[styles.helper, { color: c.muted, marginTop: 8 }]}>We just need to check. Again.</Text>
            <View style={[styles.actionRow, { flexDirection: buttonSwap ? 'row-reverse' : 'row', marginTop: 22 }]}>{btn('Go back', () => { setConfirm(null); mistake('Wrong choice. Five seconds, please.'); }, false, { flex: 1 })}{btn(confirm && confirm.step === confirm.required - 1 ? 'I swear' : 'Confirm', confirmNext, true, { flex: 1 })}</View>
          </View></View>
        </Modal>

        <Modal visible={ringing} transparent animationType="slide" onRequestClose={() => {}}>
          <View style={styles.ringScrim} onTouchEnd={toggleTheme}><View style={styles.ringDialog}>
            <Text style={styles.ringKicker}>WAKE UP CALL</Text><Text style={styles.ringTitle}>Good morning.</Text><Text style={styles.ringCopy}>Silence is earned. Complete the grid.</Text>{ringZone && <Text style={{ color: '#555B65', fontSize: 9, marginBottom: 8 }}>Assigned to UTC{ringZone.offset >= 0 ? '+' : ''}{ringZone.offset} {ringZone.label}{ringPeriod ? ` · ${ringPeriod}` : ''}</Text>}
            <View style={styles.sudoku}>{grid.map((value, i) => <Pressable key={i} onPress={() => setActiveCell(i)} style={[styles.sudokuCell, { borderColor: (i % 4 === 1 ? '#697281' : '#353A44'), borderRightWidth: i % 2 === 1 ? 2 : 1, borderBottomWidth: i > 7 ? 2 : 1, backgroundColor: activeCell === i ? '#243A58' : '#191D24' }]}><Text style={{ color: value ? '#F4F6F9' : '#91B1FF', fontSize: 21, fontWeight: '700' }}>{value || ''}</Text></Pressable>)}</View>
            <View style={styles.numRow}>{[1, 2, 3, 4].map((n) => <Pressable key={n} onPress={() => enterDigit(n)} style={styles.numKey}><Text style={styles.numText}>{n}</Text></Pressable>)}</View>
            <Text style={styles.sudokuHint}>Every row. Every column. Every box.</Text>
            {ringStartedAt && now - ringStartedAt > 30000 && <Pressable onPress={() => setRinging(false)} style={{ alignSelf: 'center', padding: 5, marginTop: 6 }}><Text style={{ color: '#5C6068', fontSize: 9 }}>I give up, I&apos;m awake</Text></Pressable>}
          </View></View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  calcTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calcSub: { fontSize: 8, letterSpacing: 1, marginTop: 4, fontWeight: '700' }, calcMemory: { fontSize: 11, fontWeight: '900', letterSpacing: 1 }, calcDisplay: { minHeight: 75, borderWidth: 1, borderRadius: 12, marginTop: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }, calcValue: { minWidth: 52, alignItems: 'center', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' }, calcDigits: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] }, calcUnit: { fontSize: 8, letterSpacing: 1, fontWeight: '700', marginTop: 2 }, calcColon: { fontSize: 23, fontWeight: '700', marginHorizontal: 1, marginBottom: 8 }, calcResult: { marginLeft: 'auto', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, periodBadge: { marginLeft: 8, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 }, calcGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 7, marginTop: 12 }, calcKey: { width: '23%', height: 43, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  page: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30 }, topLine: { flexDirection: 'row', alignItems: 'center' }, brand: { fontSize: 19, letterSpacing: 1.1, fontWeight: '900' }, kicker: { fontSize: 9, letterSpacing: 1.4, marginTop: 3, fontWeight: '600' }, session: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11, minWidth: 105 }, liveDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#E76767', top: 12, right: 11 }, warning: { fontSize: 11, marginTop: 12, marginBottom: 18, fontWeight: '600' }, hero: { borderRadius: 22, padding: 22, minHeight: 174, justifyContent: 'center' }, heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroEyebrow: { fontSize: 10, color: '#B8C4D5', letterSpacing: 1.3, fontWeight: '700' }, nowPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF18', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 }, whiteDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8DE0B2', marginRight: 5 }, nowText: { color: '#DDE6F2', fontSize: 9, fontWeight: '800' }, bigTime: { color: '#FFFFFF', fontSize: 52, lineHeight: 61, fontWeight: '800', letterSpacing: -2, marginTop: 10 }, heroSub: { color: '#AAB9CC', fontSize: 12 }, sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 }, heading: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }, sectionMeta: { fontSize: 9, letterSpacing: 1, fontWeight: '700' }, card: { borderWidth: 1, borderRadius: 18, padding: 17 }, label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' }, timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 }, timeInput: { borderWidth: 1, borderRadius: 12, width: 76, height: 58, textAlign: 'center', fontSize: 27, fontWeight: '800' }, colon: { fontSize: 28, fontWeight: '700', marginHorizontal: 8 }, amPm: { fontSize: 11, fontWeight: '800' }, helper: { fontSize: 11, marginTop: 7 }, actionRow: { flexDirection: 'row', gap: 9, marginTop: 15 }, button: { minHeight: 44, paddingHorizontal: 13, borderWidth: 1, borderRadius: 11, justifyContent: 'center', alignItems: 'center' }, emptyCard: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }, emptyIcon: { fontSize: 30, marginRight: 13 }, emptyTitle: { fontSize: 14, fontWeight: '700' }, alarmRow: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }, alarmTime: { fontSize: 22, fontWeight: '800' }, trigger: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, triggerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, footer: { textAlign: 'center', letterSpacing: 1.2, fontSize: 9, marginTop: 25 }, toast: { position: 'absolute', bottom: 20, left: 18, right: 18, backgroundColor: '#252932', borderRadius: 12, padding: 13, elevation: 9 }, toastText: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', fontWeight: '600' }, scrim: { flex: 1, backgroundColor: '#080B12B8', justifyContent: 'center', padding: 22 }, dialog: { borderRadius: 22, padding: 20, maxWidth: 460, width: '100%', alignSelf: 'center' }, modalKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }, modalTitle: { fontSize: 20, fontWeight: '800', lineHeight: 27, marginTop: 8 }, tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }, tile: { width: '31%', aspectRatio: 1, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, ringScrim: { flex: 1, backgroundColor: '#07090DEB', justifyContent: 'center', padding: 22 }, ringDialog: { backgroundColor: '#10141B', borderRadius: 24, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#303844' }, ringKicker: { color: '#FF8A79', fontSize: 10, letterSpacing: 2, fontWeight: '800' }, ringTitle: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', marginTop: 5 }, ringCopy: { color: '#ABB3C0', fontSize: 13, marginTop: 6, marginBottom: 18 }, sudoku: { width: 240, height: 240, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: '#697281' }, sudokuCell: { width: '25%', height: '25%', justifyContent: 'center', alignItems: 'center', borderWidth: 1 }, numRow: { flexDirection: 'row', gap: 10, marginTop: 15 }, numKey: { width: 48, height: 42, backgroundColor: '#26364F', borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, numText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' }, sudokuHint: { color: '#798392', fontSize: 10, marginTop: 12 },
});
