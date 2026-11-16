import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthButton, AuthShell, Field, Notice } from './Authkit';

const ERRORS = {
  bad_name: 'Use a name with 2 to 30 letters.',
  bad_grade: 'Choose your grade.',
  already_set_up: 'Your account is already set up.',
};

// The first time someone signs in with Google or Facebook:
// are they a student (which grade?) or a teacher?
export default function CompleteProfile({ name: startName, onDone, onLogout }) {
  const [role, setRole] = useState('student');
  const [name, setName] = useState(startName || '');
  const [grade, setGrade] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTeacher = role === 'teacher';

  async function save(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { error: problem } = await supabase.rpc('complete_onboarding', {
      p_role: role,
      p_grade: isTeacher ? null : Number(grade),
      p_name: name,
    });

    if (problem) {
      const key = Object.keys(ERRORS).find((item) => problem.message.includes(item));
      setError(key ? ERRORS[key] : problem.message);
      setLoading(false);
      return;
    }

    await onDone();
  }

  return (
    <AuthShell
      title="Welcome!"
      subtitle="Tell us a little about you to finish your account."
      footer={
        <button type="button" className="au-link au-link--strong" onClick={onLogout}>
          Sign out
        </button>
      }
    >
      <div className="au-roles" role="group" aria-label="Who are you?">
        <button type="button" className={`au-role ${!isTeacher ? 'is-on' : ''}`} onClick={() => setRole('student')} aria-pressed={!isTeacher}>
          I am a student
        </button>
        <button type="button" className={`au-role ${isTeacher ? 'is-on' : ''}`} onClick={() => setRole('teacher')} aria-pressed={isTeacher}>
          I am a teacher
        </button>
      </div>

      <form onSubmit={save} noValidate>
        <Field label="NAME" type="text" value={name} onChange={setName} placeholder="Your name or nickname" maxLength={30} />

        {!isTeacher && (
          <Field label="GRADE" as="select" value={grade} onChange={setGrade}>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                Grade {value}
              </option>
            ))}
          </Field>
        )}

        {isTeacher && (
          <p className="au-hint">
            Teacher accounts need approval from an admin. You will see a waiting
            screen until you are approved.
          </p>
        )}

        <Notice>{error}</Notice>

        <AuthButton type="submit" loading={loading}>
          {isTeacher ? 'REQUEST TEACHER ACCOUNT' : 'START LEARNING'}
        </AuthButton>
      </form>
    </AuthShell>
  );
}