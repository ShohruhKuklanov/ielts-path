import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Card } from './Card';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}

/** Placeholder card for a feature that a later build step fills in. */
export function ComingSoon({ icon, title, body }: Props) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="heading">{title}</AppText>
      <AppText muted>{body}</AppText>
      <AppText variant="small" color={colors.primary}>
        Coming soon
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  badge: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
