import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { BRAND_BLUE, BRAND_BLUE_DARK, BRAND_NAVY } from '@/theme/tokens';

/**
 * The IELTS PATH wordmark, drawn as text so it stays sharp at any size.
 * Light theme: navy "IELTS" + Path Blue "PATH" (matches assets/ielts-path-logo.svg).
 * Dark theme: light text + Path Blue Dark, so both words keep AA contrast.
 */
export function BrandWordmark() {
  const { scheme, colors } = useTheme();
  const dark = scheme === 'dark';
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="IELTS PATH" style={styles.logo}>
      <Text style={[styles.ielts, { color: dark ? colors.text : BRAND_NAVY }]}>IELTS</Text>
      <Text style={[styles.path, { color: dark ? BRAND_BLUE_DARK : BRAND_BLUE }]}>PATH</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center', width: 190, paddingLeft: 20 },
  ielts: { fontSize: 55, fontWeight: '700', letterSpacing: -1.5, lineHeight: 60 },
  path: { fontSize: 50, fontWeight: '500', letterSpacing: 3.5, lineHeight: 60 },
});
