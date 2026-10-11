import { STAGES } from '@ielts/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

// Step 1 shows the path from shared constants. Step 7 reads stages, modules and
// lessons from the database and adds progress and the stage tests.
export default function Learn() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const current = profile?.current_stage_id ?? 1;

  return (
    <Screen>
      <AppText variant="title">Your path</AppText>
      <AppText muted>Seven stages, from your first word to IELTS 9.</AppText>

      {STAGES.map((s) => {
        const open = s.order <= current;
        const band = s.bandFrom != null ? `IELTS ${s.bandFrom.toFixed(1)}–${s.bandTo?.toFixed(1)}` : 'Start here';
        return (
          <Card key={s.code} style={[styles.row, !open && { opacity: 0.6 }]}>
            <View style={[styles.num, { backgroundColor: open ? colors.primary : colors.surfaceAlt }]}>
              <AppText variant="label" color={open ? colors.onPrimary : colors.textMuted}>
                {s.order}
              </AppText>
            </View>
            <View style={styles.text}>
              <AppText variant="label">{s.title}</AppText>
              <AppText variant="small" muted>
                {s.cefrFrom === s.cefrTo ? s.cefrFrom : `${s.cefrFrom} to ${s.cefrTo}`} · {band}
              </AppText>
            </View>
            <Ionicons
              name={open ? 'chevron-forward' : 'lock-closed'}
              size={20}
              color={colors.textMuted}
              accessibilityLabel={open ? 'Open' : 'Locked'}
            />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  num: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
