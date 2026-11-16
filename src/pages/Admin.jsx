import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { levelInfo } from '../lib/progress';
import { fetchRequests, reviewRequest, revokeTeacher } from '../lib/staff';
import './Admin.css';

export default function Admin({ profile, onHome, onLogout }) {
  // Admins approve teachers. Teachers only see their students.
  const isAdmin = profile?.role === 'admin';

  const [people, setPeople] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, error: peopleError } = await supabase
      .from('profiles')
      .select('id, name, grade, role, xp, created_at')
      .order('created_at', { ascending: false });

    if (peopleError) {
      console.error('Admin profile error:', peopleError);
      setError(peopleError.message);
      setLoading(false);
      return;
    }

    setPeople(data || []);

    if (isAdmin) {
      try {
        setRequests(await fetchRequests());
      } catch (err) {
        setError(err.message);
      }
    }

    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(request, approve) {
    setBusyId(request.id);
    setError('');
    setNotice('');

    try {
      await reviewRequest(request.id, approve);
      setNotice(
        approve
          ? `${request.name} is now a teacher.`
          : `${request.name}'s request was declined.`
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function removeTeacher(person) {
    if (!window.confirm(`Remove teacher access from ${person.name}?`)) return;

    setBusyId(person.id);
    setError('');
    setNotice('');

    try {
      await revokeTeacher(person.id);
      setNotice(`${person.name} is a student again.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  const students = people.filter((person) => person.role === 'student');
  const teachers = people.filter((person) => person.role === 'teacher');
  const pending = requests.filter((request) => request.status === 'pending');

  const gradeCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  useEffect(() => {
    document.body.classList.add('admin-dashboard-active');
    return () => document.body.classList.remove('admin-dashboard-active');
  }, []);

  students.forEach((student) => {
    if (gradeCounts[student.grade] !== undefined) {
      gradeCounts[student.grade] += 1;
    }
  });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-heading">
          <svg
            className="admin-logo"
            viewBox="0 0 100 100"
            role="img"
            aria-label="Kiddocation"
          >
            <rect width="100" height="100" rx="24" fill="#f4f4f4" />
            <rect x="10" y="24" width="80" height="58" rx="29" fill="#ff8a00" />
            <text x="50" y="69" textAnchor="middle" fontFamily="Poppins, system-ui, sans-serif" fontSize="52" fontWeight="800" fill="#d8ebb9" stroke="#b4d77b" strokeWidth="1.5" paintOrder="stroke">
              K
            </text>
            <rect x="77" y="11" width="12" height="4" rx="2" fill="#ff8a00" transform="rotate(-28 83 13)" />
          </svg>
          <div className="admin-heading__text">
            <p className="admin-label">KIDDOCATION</p>
            <h1>{isAdmin ? 'Admin Dashboard' : 'Teacher Dashboard'}</h1>
            <p className="admin-subtitle">
              {isAdmin
                ? 'Approve teachers and monitor your students.'
                : 'See how your students are doing.'}
            </p>
          </div>
        </div>

        <div className="admin-actions">
          <button type="button" onClick={onHome}>
            Home
          </button>

          <button type="button" className="admin-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="admin-overview">
        <div className="admin-stat">
          <span className="admin-stat-label">TOTAL STUDENTS</span>
          <strong>{students.length}</strong>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">TEACHERS</span>
          <strong>{teachers.length}</strong>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">
            {isAdmin ? 'WAITING FOR APPROVAL' : 'GRADES 1–6'}
          </span>
          <strong>{isAdmin ? pending.length : students.length}</strong>
        </div>
      </section>

      <section className="admin-content">
        {error && <div className="admin-error">{error}</div>}
        {notice && <div className="admin-notice">{notice}</div>}

        {/* ADMIN ONLY: teacher requests */}
        {isAdmin && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Teacher requests</h2>
                <p>People who signed up as teachers</p>
              </div>

              <button type="button" onClick={load}>
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="admin-loading">Loading...</div>
            ) : pending.length === 0 ? (
              <div className="admin-empty">No one is waiting for approval.</div>
            ) : (
              <div className="student-table-wrapper">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Asked on</th>
                      <th>Decision</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pending.map((request) => (
                      <tr key={request.id}>
                        <td>{request.name}</td>
                        <td>{request.email}</td>
                        <td>{new Date(request.created_at).toLocaleDateString()}</td>
                        <td className="request-actions">
                          <button
                            type="button"
                            className="request-approve"
                            disabled={busyId === request.id}
                            onClick={() => decide(request, true)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="request-decline"
                            disabled={busyId === request.id}
                            onClick={() => decide(request, false)}
                          >
                            Decline
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STUDENTS */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Students</h2>
              <p>Registered Kiddocation students</p>
            </div>

            {!isAdmin && (
              <button type="button" onClick={load}>
                Refresh
              </button>
            )}
          </div>

          {loading ? (
            <div className="admin-loading">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="admin-empty">No student accounts yet.</div>
          ) : (
            <div className="student-table-wrapper">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Grade</th>
                    <th>Level</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name || 'Unnamed Student'}</td>
                      <td>Grade {student.grade || '—'}</td>
                      <td>Level {levelInfo(student.xp || 0).level}</td>
                      <td>{new Date(student.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ADMIN ONLY: current teachers */}
        {isAdmin && teachers.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Teachers</h2>
                <p>People with teacher access</p>
              </div>
            </div>

            <div className="student-table-wrapper">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Since</th>
                    <th>Access</th>
                  </tr>
                </thead>

                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.name || 'Teacher'}</td>
                      <td>{new Date(teacher.created_at).toLocaleDateString()}</td>
                      <td className="request-actions">
                        <button
                          type="button"
                          className="request-decline"
                          disabled={busyId === teacher.id}
                          onClick={() => removeTeacher(teacher)}
                        >
                          Remove access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Students by Grade</h2>
              <p>Current account distribution</p>
            </div>
          </div>

          <div className="grade-grid">
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <div className="grade-stat" key={grade}>
                <span>Grade {grade}</span>
                <strong>{gradeCounts[grade]}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}