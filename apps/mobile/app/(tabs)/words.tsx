import { AppText } from '@/components/AppText';
import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/Screen';

export default function Words() {
  return (
    <Screen>
      <AppText variant="title">Words</AppText>
      <ComingSoon
        icon="albums-outline"
        title="Your word cards"
        body="Learn new words with pictures and sound. The app shows each word again just before you forget it."
      />
    </Screen>
  );
}
