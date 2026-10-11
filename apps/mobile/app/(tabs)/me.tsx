import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ComingSoon } from '@/components/ComingSoon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { signOut } from '@/lib/auth';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

const THEME_OPTIONS = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

export default function Me() {
  const { session, profile } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const user = session?.user;
  const contact = user?.email || user?.phone || '';
  const name = profile?.display_name || contact;

  return (
    <Screen>
      <AppText variant="title">Me</AppText>

      <Card style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="person" size={28} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="label" numberOfLines={1}>
            {name}
          </AppText>
          {profile?.display_name && contact ? (
            <AppText variant="small" muted numberOfLines={1}>
              {contact}
            </AppText>
          ) : null}
          <AppText variant="small" muted>
            {profile?.plan === 'premium' ? 'Premium' : 'Free plan'}
          </AppText>
        </View>
      </Card>

      <ComingSoon
        icon="stats-chart-outline"
        title="Your progress"
        body="Your band for each skill, your goal, and what to work on next."
      />

      <Card>
        <AppText variant="label">Appearance</AppText>
        <SegmentedControl options={THEME_OPTIONS} value={preference} onChange={setPreference} />
      </Card>

      <Button
        variant="secondary"
        icon="log-out-outline"
        label="Sign out"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
