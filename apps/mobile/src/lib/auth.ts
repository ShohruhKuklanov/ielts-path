import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type CodeChannel = 'email' | 'phone';

/** Turns an auth error into a short message a beginner can follow. */
export function friendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const msg = raw.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('too many'))
    return 'Please wait a moment, then ask for a new code.';
  if (msg.includes('token') || msg.includes('otp') || msg.includes('expired'))
    return 'This code is wrong or too old. Try again, or get a new code.';
  if (msg.includes('phone') && (msg.includes('provider') || msg.includes('unsupported')))
    return 'Phone sign-in is not ready yet. Please use email.';
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider'))
    return 'This sign-in option is not ready yet. Please use email.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'No internet connection. Check it and try again.';
  return 'Something went wrong. Please try again.';
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Keeps "+" and digits only. Phone numbers must include the country code, e.g. +998 90 123 45 67. */
export const normalizePhone = (v: string) => {
  const digits = v.replace(/[^\d]/g, '');
  return digits ? `+${digits}` : '';
};
export const isValidPhone = (v: string) => /^\+\d{8,15}$/.test(normalizePhone(v)) && v.trim().startsWith('+');

export async function sendCode(channel: CodeChannel, target: string) {
  const { error } =
    channel === 'email'
      ? await supabase.auth.signInWithOtp({ email: target.trim().toLowerCase(), options: { shouldCreateUser: true } })
      : await supabase.auth.signInWithOtp({ phone: normalizePhone(target) });
  if (error) throw error;
}

export async function verifyCode(channel: CodeChannel, target: string, token: string) {
  const { error } =
    channel === 'email'
      ? await supabase.auth.verifyOtp({ email: target.trim().toLowerCase(), token, type: 'email' })
      : await supabase.auth.verifyOtp({ phone: normalizePhone(target), token, type: 'sms' });
  if (error) throw error;
}

/**
 * Google, and Apple on Android/web: browser-based OAuth with PKCE.
 * Native: opens an in-app browser and exchanges the returned code for a session.
 * Web: a normal redirect; supabase-js finishes the sign-in when the page reloads.
 * Returns false if the person closed the browser.
 */
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<boolean> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return true;
  }

  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;

  const { queryParams } = Linking.parse(result.url);
  const errorDescription = queryParams?.error_description;
  if (typeof errorDescription === 'string') throw new Error(errorDescription);

  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('No sign-in code returned');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return true;
}

/** Native Sign in with Apple (iOS). Returns false if the person cancelled. */
export async function signInWithAppleNative(): Promise<boolean> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple did not return an identity token');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple shares the person's name only on the first sign-in, so save it now.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (name && data.user) {
    await supabase.from('profiles').update({ display_name: name }).eq('id', data.user.id);
  }
  return true;
}

export async function signOut() {
  await supabase.auth.signOut();
}
