'use client';
// Signs staff in with a 6-digit email code and shows the admin only to admins/editors.
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { isConfigured, supabase } from './supabase';

type Staff = 'checking' | 'yes' | 'no';

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff>('checking');
  const path = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setStaff('checking');
    supabase.rpc('is_staff').then(({ data }) => setStaff(data ? 'yes' : 'no'));
  }, [session]);

  if (!isConfigured)
    return <div className="center"><h1>Setup needed</h1><p className="muted">Fill in apps/admin/.env.local (run setup.command).</p></div>;
  if (!ready) return null;
  if (!session) return <Login />;
  if (staff === 'checking') return null;
  if (staff === 'no')
    return (
      <div className="center">
        <h1>No admin access</h1>
        <p>
          Signed in as <b>{session.user.email}</b>, but this account is not an admin or editor yet.
        </p>
        <p className="muted">Double-click <b>make-admin.command</b> in the ielts-app folder, enter this email, then reload.</p>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );

  const nav = [
    ['/', 'Dashboard'],
    ['/content', 'Content'],
    ['/review', 'Review queue'],
  ] as const;
  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">IELTS PATH admin</div>
        {nav.map(([href, label]) => (
          <Link key={href} href={href} className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}>
            {label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 13 }}>{session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ error: Error | null }>) => {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    setBusy(false);
    return error ? (setError(error.message), false) : true;
  };

  return (
    <form
      className="center"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!sent) {
          if (await run(() => supabase.auth.signInWithOtp({ email: email.trim() }))) setSent(true);
        } else {
          await run(() => supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' }));
        }
      }}
    >
      <h1>Admin sign in</h1>
      <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} />
      {sent && (
        <>
          <p className="muted">
            Enter the 6-digit code. Locally it is at <a href="http://127.0.0.1:54324" target="_blank" rel="noreferrer">127.0.0.1:54324</a>.
          </p>
          <input inputMode="numeric" autoFocus placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
        </>
      )}
      <button className="primary" disabled={busy}>{sent ? 'Sign in' : 'Send code'}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
