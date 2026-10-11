import { Redirect } from 'expo-router';

// The OAuth browser hands control back to the app at ieltsapp://auth/callback.
// The sign-in itself is finished in src/lib/auth.ts; this route only sends the person home.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
