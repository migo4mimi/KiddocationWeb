import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { authErrorText } from '../lib/Oauth';
import { AuthButton, AuthShell, Field, Notice } from './Authkit';

export default function ForgotPassword({ onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    const { error: problem } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });

    setLoading(false);

    if (problem) {
      setError(authErrorText(problem));
      return;
    }

    setMessage('If that email has an account, a reset link is on its way. Check your inbox and spam folder.');
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we will send you a reset link."
      footer={
        <button type="button" className="au-link au-link--strong" onClick={onNavigateToLogin}>
          Back to login
        </button>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Field label="EMAIL" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />

        <Notice>{error}</Notice>
        <Notice kind="success">{message}</Notice>

        <AuthButton type="submit" loading={loading}>
          SEND RESET LINK
        </AuthButton>
      </form>
    </AuthShell>
  );
}