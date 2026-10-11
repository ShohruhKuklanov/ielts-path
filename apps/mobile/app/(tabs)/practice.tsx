import { AppText } from '@/components/AppText';
import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/Screen';

export default function Practice() {
  return (
    <Screen>
      <AppText variant="title">Practice</AppText>
      <ComingSoon
        icon="create-outline"
        title="Writing"
        body="Write a text and get a score, your mistakes, and tips for a higher band."
      />
      <ComingSoon icon="headset-outline" title="Listening and Reading" body="IELTS-style questions at your level." />
      <ComingSoon icon="mic-outline" title="Speaking" body="Talk with an AI examiner and get a score." />
    </Screen>
  );
}
