import { useState } from 'react';
import PrimaryButton from '../components/PrimaryButton';
import {
  ADMIN_EMAIL,
  requestTeacherAccess,
  teacherRequestLink,
} from '../lib/staff';
import './Login.css';

// Shown to someone who signed up as a teacher and is not approved yet.
export default function PendingTeacher({
  request,
  name,
  email,
  onCheckAgain,
  onContinueAsStudent,
  onLogout,
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const rejected = request?.status === 'rejected';

  async function check() {
    setBusy(true);
    setMessage('');

    try {
      await onCheckAgain();
    } finally {
      setBusy(false);
    }
  }

  async function askAgain() {
    setBusy(true);
    setMessage('');

    try {
      await requestTeacherAccess();
      await onCheckAgain();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo__letter">K</span>
        </div>

        <h1 className="login-title">
          {rejected ? 'Not approved' : 'Waiting for approval'}
        </h1>

        <p className="login-subtitle" style={{ lineHeight: 1.6 }}>
          {rejected
            ? 'Your teacher request was not approved. You can ask again or write to the admin.'
            : 'Your teacher account is waiting for an admin to approve it. This usually does not take long.'}
        </p>

        <p style={{ margin: '14px 0', fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
          Want it faster? Send an email to{' '}
          <a href={teacherRequestLink({ name, email })}>{ADMIN_EMAIL}</a>
        </p>

        {message && <p className="login-error">{message}</p>}

        <PrimaryButton type="button" loading={busy} onClick={rejected ? askAgain : check}>
          {rejected ? 'REQUEST AGAIN' : 'CHECK AGAIN'}
        </PrimaryButton>

        <p className="login-signup-link">
          {rejected && (
            <>
              <button
                type="button"
                className="login-signup-link__button"
                onClick={onContinueAsStudent}
              >
                Continue as a student
              </button>
              {' · '}
            </>
          )}
          <button
            type="button"
            className="login-signup-link__button"
            onClick={onLogout}
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}