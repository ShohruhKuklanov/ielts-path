import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BrandWordmark } from '@/components/BrandWordmark';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

// Very simple English: a true beginner should understand every line with the icons.
const POINTS: { icon: ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
  { icon: 'calendar-outline', title: 'Learn every day', body: 'The app tells you what to do today.' },
  { icon: 'create-outline', title: 'Get help with writing', body: 'See your mistakes and how to fix them.' },
  { icon: 'trending-up-outline', title: 'See your score grow', body: 'From your first word to IELTS 9.' },
];

export default function Welcome() {
  const { colors } = useTheme();
  return (
    <Screen footer={<Button label="Get started" icon="arrow-forward" onPress={() => router.push('/sign-in')} />}>
      <View style={styles.hero}>
        <BrandWordmark />
        <AppText variant="title" center>
          From zero English to IELTS 9
        </AppText>
      </View>

      <View style={styles.points}>
        {POINTS.map((p) => (
          <View key={p.title} style={styles.point}>
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={p.icon} size={26} color={colors.primary} />
            </View>
            <View style={styles.pointText}>
              <AppText variant="label">{p.title}</AppText>
              <AppText muted>{p.body}</AppText>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.lg },
  points: { gap: spacing.xl },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  icon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, gap: 2 },
});
