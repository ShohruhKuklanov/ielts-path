import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import {
  friendlyAuthError,
  isValidEmail,
  isValidPhone,
  sendCode,
  signInWithAppleNative,
  signInWithOAuth,
  type CodeChannel,
} from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET } from '@/theme/tokens';

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
] as const;

type Busy = null | 'code' | 'google' | 'apple';

export default function SignIn() {
  const { scheme, colors } = useTheme();
  const [channel, setChannel] = useState<CodeChannel>('email');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [nativeApple, setNativeApple] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setNativeApple).catch(() => {});
  }, []);

  const valid = channel === 'email' ? isValidEmail(value) : isValidPhone(value);

  const onSendCode = async () => {
    if (!valid) {
      setError(channel === 'email' ? 'Please check your email address.' : 'Start with + and your country code, e.g. +998 90 123 45 67');
      return;
    }
    setError(null);
    setBusy('code');
    try {
      await sendCode(channel, value);
      router.push({ pathname: '/verify', params: { channel, target: value.trim() } });
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(null);
    }
  };

  const runProvider = async (which: 'google' | 'apple') => {
    setError(null);
    setBusy(which);
    try {
      if (which === 'apple' && nativeApple) await signInWithAppleNative();
      else await signInWithOAuth(which);
      // On success the auth listener switches the app to the tabs automatically.
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      footer={
        <Button
          label="Send me a code"
          icon="mail-outline"
          onPress={onSendCode}
          loading={busy === 'code'}
          disabled={busy !== null && busy !== 'code'}
        />
      }
    >
      <AppText variant="title">Sign in</AppText>
      <AppText muted>We will send you a 6-digit code. No password needed.</AppText>

      <SegmentedControl
        options={CHANNELS}
        value={channel}
        onChange={(c) => {
          setChannel(c);
          setValue('');
          setError(null);
        }}
      />

      {channel === 'email' ? (
        <TextField
          key="email"
          label="Your email"
          placeholder="name@example.com"
          value={value}
          onChangeText={setValue}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={onSendCode}
          error={error}
        />
      ) : (
        <TextField
          key="phone"
          label="Your phone number"
          placeholder="+998 90 123 45 67"
          value={value}
          onChangeText={setValue}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="send"
          onSubmitEditing={onSendCode}
          error={error}
        />
      )}

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <AppText variant="small" muted>
          or
        </AppText>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      <Button
        variant="secondary"
        icon="logo-google"
        label="Continue with Google"
        onPress={() => runProvider('google')}
        loading={busy === 'google'}
        disabled={busy !== null && busy !== 'google'}
      />

      {nativeApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radius.md}
          style={styles.appleButton}
          onPress={() => runProvider('apple')}
        />
      ) : (
        <Button
          variant="secondary"
          icon="logo-apple"
          label="Continue with Apple"
          onPress={() => runProvider('apple')}
          loading={busy === 'apple'}
          disabled={busy !== null && busy !== 'apple'}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  appleButton: { width: '100%', height: TOUCH_TARGET },
});
