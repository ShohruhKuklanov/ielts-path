import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

/** Shown to developers when apps/mobile/.env is missing. Learners never see this. */
export function SetupNeeded() {
  return (
    <Screen>
      <AppText variant="title">Almost ready</AppText>
      <AppText muted>The app cannot reach the database yet.</AppText>
      <Card>
        <AppText variant="label">To fix it</AppText>
        <AppText>1. Copy apps/mobile/.env.example to apps/mobile/.env</AppText>
        <AppText>2. Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY</AppText>
        <AppText>3. Stop the app and run it again (pnpm dev)</AppText>
      </Card>
    </Screen>
  );
}
