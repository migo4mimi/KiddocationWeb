import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { authErrorText, signInWithProvider } from '../lib/Oauth';
import { AuthButton, AuthShell, Field, Notice, SocialButtons } from './Authkit';

export default function Login({
  onNavigateToSignup,
  onNavigateToForgot,
  initialError = '',
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(initialError);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    const { error: problem } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    // On success App.jsx notices the new session and opens the right page.
    if (problem) setError(authErrorText(problem));
  }

  async function handleProvider(name) {
    setError('');
    setProvider(name);

    const problem = await signInWithProvider(name);

    // When it works the browser leaves for Google or Facebook.
    if (problem) {
      setError(problem);
      setProvider(null);
    }
  }

  return (
    <AuthShell
      title="Login"
      subtitle="Sign in to continue."
      footer={
        <>
          <button type="button" className="au-link" onClick={onNavigateToForgot}>
            Forgot Password?
          </button>
          <p>
            Don&apos;t have an account?{' '}
            <button type="button" className="au-link au-link--strong" onClick={onNavigateToSignup}>
              Sign up!
            </button>
          </p>
        </>
      }
    >
      <form onSubmit={handleLogin} noValidate>
        <Field
          label="EMAIL"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />
        <Field
          label="PASSWORD"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          placeholder="••••••"
        />

        <Notice>{error}</Notice>

        <AuthButton type="submit" loading={loading}>
          LOG IN
        </AuthButton>
      </form>

      <SocialButtons onProvider={handleProvider} busy={provider} disabled={loading} />
    </AuthShell>
  );
}