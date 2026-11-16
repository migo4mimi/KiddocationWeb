import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { authErrorText } from '../lib/Oauth';
import { AuthButton, AuthShell, Field, Notice } from './Authkit';

// Shown after someone clicks the reset link in their email.
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: problem } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (problem) {
      setError(authErrorText(problem));
      return;
    }

    onDone();
  }

  return (
    <AuthShell title="New password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} noValidate>
        <Field label="NEW PASSWORD" type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
        <Field label="CONFIRM PASSWORD" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} placeholder="Type it again" />

        <Notice>{error}</Notice>

        <AuthButton type="submit" loading={loading}>
          SAVE PASSWORD
        </AuthButton>
      </form>
    </AuthShell>
  );
}