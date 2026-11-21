import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { TimeMachineLogo } from './TimeMachineLogo';

export function TimeMachineSplash({ progress, status, onSkip }: { progress: number; status: string; onSkip: () => void }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Skip splash screen" onPress={onSkip} style={styles.screen}>
      <View style={styles.center} pointerEvents="none">
        {logoFailed
          ? <TimeMachineLogo size={188} />
          : <Image source={require('../../assets/TimeMachine.png')} onError={() => setLogoFailed(true)} resizeMode="contain" style={styles.logo} />}
        <Text style={styles.title}>Time Machine</Text>
        <Text style={styles.subtitle}>Precision global wake-up scheduling.</Text>
      </View>
      <View style={styles.loading} pointerEvents="none">
        <View style={styles.track}><View style={[styles.progress, { width: `${progress}%` }]} /></View>
        <Text style={styles.status}>{status}</Text>
      </View>
      <Text style={styles.skip}>TAP ANYWHERE TO SKIP</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000, backgroundColor: '#131C3A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  center: { alignItems: 'center', marginTop: -26 },
  logo: { width: 188, height: 188, borderRadius: 28 },
  title: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', letterSpacing: -1.2, marginTop: 24 },
  subtitle: { color: '#CFD7E8', fontSize: 14, letterSpacing: 0.15, marginTop: 9 },
  loading: { position: 'absolute', left: 38, right: 38, bottom: 92, alignItems: 'center' },
  track: { width: '100%', height: 4, borderRadius: 4, backgroundColor: '#FFFFFF25', overflow: 'hidden' },
  progress: { height: 4, borderRadius: 4, backgroundColor: '#55ACEE' },
  status: { color: '#94A4C4', fontSize: 11, marginTop: 12, letterSpacing: 0.35 },
  skip: { position: 'absolute', bottom: 36, color: '#7181A1', fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
});
