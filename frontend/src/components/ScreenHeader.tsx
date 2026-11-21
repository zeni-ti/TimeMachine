import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme/colors';

export function ScreenHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Go back">
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 86 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F6FA', alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.ink, fontSize: 30, lineHeight: 32 },
  eyebrow: { color: COLORS.blue, fontSize: 13, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, textTransform: 'uppercase' },
});
