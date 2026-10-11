import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { friendlyAuthError, sendCode, verifyCode, type CodeChannel } from '@/lib/auth';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function Verify() {
  const params = useLocalSearchParams<{ channel: CodeChannel; target: string }>();
  const channel: CodeChannel = params.channel === 'phone' ? 'phone' : 'email';
  const target = params.target ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const lastTried = useRef('');

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || verifying) return;
    lastTried.current = value;
    setError(null);
    setVerifying(true);
    try {
      await verifyCode(channel, target, value);
      // On success the auth listener switches the app to the tabs automatically.
    } catch (e) {
      setError(friendlyAuthError(e));
      setVerifying(false);
    }
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError(null);
    // Check automatically when the sixth digit is typed (or pasted).
    if (digits.length === CODE_LENGTH && digits !== lastTried.current) submit(digits);
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      await sendCode(channel, target);
      setCode('');
      lastTried.current = '';
      setWait(RESEND_SECONDS);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button
            label="Continue"
            icon="checkmark"
            onPress={() => submit(code)}
            loading={verifying}
            disabled={code.length !== CODE_LENGTH}
          />
          <Button
            variant="ghost"
            label={wait > 0 ? `Get a new code in ${wait}s` : 'Get a new code'}
            onPress={onResend}
            loading={resending}
            disabled={wait > 0 || verifying}
          />
        </>
      }
    >
      <AppText variant="title">Enter your code</AppText>
      <AppText muted>
        We sent a {CODE_LENGTH}-digit code to {target}.
        {channel === 'email' ? ' Check your spam folder too.' : ''}
      </AppText>

      <TextField
        label="Code"
        placeholder="123456"
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        autoComplete={channel === 'phone' ? 'sms-otp' : 'one-time-code'}
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        autoFocus
        error={error}
        style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center' }}
      />
    </Screen>
  );
}
