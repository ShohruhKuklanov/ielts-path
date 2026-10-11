import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Today() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const firstName = profile?.display_name?.split(' ')[0];

  return (
    <Screen>
      <AppText variant="title">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}
      </AppText>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Ionicons name="flame" size={24} color={colors.streak} />
          <AppText variant="heading">{profile?.streak_current ?? 0}</AppText>
          <AppText variant="small" muted>
            day streak
          </AppText>
        </Card>
        <Card style={styles.stat}>
          <Ionicons name="time" size={24} color={colors.primary} />
          <AppText variant="heading">0/{profile?.daily_goal_minutes ?? 20}</AppText>
          <AppText variant="small" muted>
            minutes today
          </AppText>
        </Card>
      </View>

      <ComingSoon
        icon="compass-outline"
        title="Find your level"
        body="A short test will show your English level. Then you get a plan for every day."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'flex-start', gap: spacing.xs },
});
