import { useState } from 'react';
import { signInWithProvider } from '../lib/Oauth';
import { ADMIN_EMAIL, teacherRequestLink } from '../lib/staff';
import { AuthButton, AuthShell, Field, Notice, SocialButtons } from './Authkit';

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function Signup({ onNavigateToLogin, onSignup }) {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isTeacher = role === 'teacher';

  async function handleSignup(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!name || !email || !password) {
      setError('Please fill in every field.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);

    // Name and grade are saved with the account. Teachers have no grade and
    // wait for an admin to approve them.
    const result = await onSignup({
      name,
      grade: isTeacher ? null : Number(grade),
      email: email.trim(),
      password,
      wantsTeacher: isTeacher,
    });

    setLoading(false);

    if (result?.error) setError(result.error);
    else if (result?.message) setMessage(result.message);
  }

  async function handleProvider(providerName) {
    setError('');
    setProvider(providerName);

    const problem = await signInWithProvider(providerName);

    if (problem) {
      setError(problem);
      setProvider(null);
    }
  }

  return (
    <AuthShell
      title="Create new Account"
      subtitle="Choose who you are, then fill in your details."
      footer={
        <p>
          Already have an account?{' '}
          <button type="button" className="au-link au-link--strong" onClick={onNavigateToLogin}>
            Log in
          </button>
        </p>
      }
    >
      <div className="au-roles" role="group" aria-label="Who are you?">
        <button
          type="button"
          className={`au-role ${!isTeacher ? 'is-on' : ''}`}
          onClick={() => setRole('student')}
          aria-pressed={!isTeacher}
        >
          I am a student
        </button>
        <button
          type="button"
          className={`au-role ${isTeacher ? 'is-on' : ''}`}
          onClick={() => setRole('teacher')}
          aria-pressed={isTeacher}
        >
          I am a teacher
        </button>
      </div>

      <form onSubmit={handleSignup} noValidate>
        <Field label="NAME" type="text" autoComplete="nickname" value={name} onChange={setName} placeholder="Your name or nickname" maxLength={30} />
        <Field label="EMAIL" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label="PASSWORD" type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="At least 6 characters" />

        {!isTeacher && (
          <Field label="GRADE" as="select" value={grade} onChange={setGrade}>
            {GRADE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                Grade {value}
              </option>
            ))}
          </Field>
        )}

        {isTeacher && (
          <p className="au-hint">
            Teacher accounts need approval. After you sign up, an admin approves
            you inside the app. You can also ask by email:{' '}
            <a href={teacherRequestLink({ name, email })}>{ADMIN_EMAIL}</a>
          </p>
        )}

        <Notice>{error}</Notice>
        <Notice kind="success">{message}</Notice>

        <AuthButton type="submit" loading={loading}>
          {isTeacher ? 'REQUEST TEACHER ACCOUNT' : 'SIGN UP'}
        </AuthButton>
      </form>

      <SocialButtons onProvider={handleProvider} busy={provider} disabled={loading} />
    </AuthShell>
  );
}