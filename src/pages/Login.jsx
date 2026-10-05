import { useState } from 'react';
import { supabase } from '../lib/supabase';
import AuthInput from '../components/AuthInput';
import PrimaryButton from '../components/PrimaryButton';
import './Login.css';

export default function Login({ onNavigateToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please fill in both fields.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      // Supabase's own message is technical; a friendlier one matches the Figma error state.
      setErrorMessage('Incorrect email or password.');
      return;
    }

    // No manual navigation needed here - App.jsx listens for the auth
    // state change and will switch to the Home page automatically.
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo__letter">K</span>
        </div>

        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Sign in to continue.</p>

        <form onSubmit={handleLogin}>
          <AuthInput
            label="EMAIL"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            required
          />
          <AuthInput
            label="PASSWORD"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••"
            required
          />

          {errorMessage && <p className="login-error">{errorMessage}</p>}

          <PrimaryButton type="submit" loading={loading}>
            LOG IN
          </PrimaryButton>
        </form>

        <div className="login-divider">
          <span className="login-divider__line" />
          <span className="login-divider__text">OR</span>
          <span className="login-divider__line" />
        </div>

        <div className="login-social-row">
          <button className="login-social-button" disabled title="Coming later">
            GOOGLE
          </button>
          <button className="login-social-button" disabled title="Coming later">
            FACEBOOK
          </button>
        </div>

        <p className="login-signup-link">
          Don&apos;t have an account?{' '}
          <button type="button" className="login-signup-link__button" onClick={onNavigateToSignup}>
            Sign up!
          </button>
        </p>
      </div>
    </div>
  );
}