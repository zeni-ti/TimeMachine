import { Pressable, StyleSheet, View } from 'react-native';
import { COLORS } from '../theme/colors';

export function Switch({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={onChange}
      style={[styles.switch, value && styles.switchOn]}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#A9B6C9', padding: 3 },
  switchOn: { backgroundColor: '#3D79EA' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white },
  thumbOn: { marginLeft: 20 },
});
