'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup' | 'reset';

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(linkError ? 'That link has expired or was already used. Sign in or request a new one.' : '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage('');
    const supabase = createClient();
    const emailRedirectTo = `${location.origin}/auth/callback`;
    const { error } =
      mode === 'signin' ? await supabase.auth.signInWithPassword({ email, password })
      : mode === 'signup' ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo } })
      : await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirectTo });
    setBusy(false);
    if (error) return setMessage(error.message);
    if (mode === 'signin') { router.replace('/'); router.refresh(); return; }
    setMessage(mode === 'signup' ? 'Check your email to confirm your account, then sign in.' : 'Check your email for a sign-in link. You can set a new password from Progress & backups.');
  }

  return <main className="login-page">
    <form className="login-card" onSubmit={submit}>
      <div className="brand login-brand"><span className="brand-mark">a<span>•</span></span><div>Automation<span>ACADEMY</span></div></div>
      <h1>{mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}</h1>
      <p className="muted">{mode === 'reset' ? 'We will email you a one-time sign-in link.' : 'Your progress, notes and career tracker are saved to your account.'}</p>
      <label className="field-label" htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      {mode !== 'reset' && <><label className="field-label" htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></>}
      {message && <p className="login-message" role="status">{message}</p>}
      <button className="primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={16} />}{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send link'}</button>
      <div className="login-links">
        {mode !== 'signin' && <button type="button" className="text-button" onClick={() => setMode('signin')}>Back to sign in</button>}
        {mode === 'signin' && <button type="button" className="text-button" onClick={() => setMode('signup')}>Create an account</button>}
        {mode === 'signin' && <button type="button" className="text-button" onClick={() => setMode('reset')}>Forgot password?</button>}
      </div>
    </form>
  </main>;
}
