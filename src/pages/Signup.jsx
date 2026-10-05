import { useState } from 'react';
import { supabase } from '../lib/supabase';
import AuthInput from '../components/AuthInput';
import PrimaryButton from '../components/PrimaryButton';
import './Signup.css';

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function Signup({ onNavigateToLogin }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');

  async function handleSignup(e) {
    e.preventDefault();
    setErrorMessage('');
    setConfirmationMessage('');

    if (!name || !email || !password) {
      setErrorMessage('Please fill in every field.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);

    // name/grade are passed as user metadata, not written directly to
    // `profiles` here - your existing Auth trigger reads this metadata
    // to create the profile row, so we don't duplicate that insert.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          grade: Number(grade),
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      // Email confirmation is turned on in your Supabase project - no
      // session comes back yet, so send them to Login instead of Home.
      setConfirmationMessage('Account created! Check your email to confirm, then log in.');
    }
    // If a session DID come back (confirmation off), App.jsx's
    // onAuthStateChange picks it up and moves straight to Home.
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <button type="button" className="signup-back-button" onClick={onNavigateToLogin} aria-label="Back to login">
          ←
        </button>

        <h1 className="signup-title">
          Create new
          <br />
          <span className="signup-title__accent">Account</span>
        </h1>

        <form onSubmit={handleSignup}>
          <AuthInput label="NAME" type="text" value={name} onChange={setName} placeholder="Your name" required />
          <AuthInput label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <AuthInput
            label="PASSWORD"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            required
          />
          <AuthInput label="GRADE" as="select" value={grade} onChange={setGrade}>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </AuthInput>

          {errorMessage && <p className="signup-error">{errorMessage}</p>}
          {confirmationMessage && <p className="signup-confirmation">{confirmationMessage}</p>}

          <PrimaryButton type="submit" loading={loading}>
            SIGN UP
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}