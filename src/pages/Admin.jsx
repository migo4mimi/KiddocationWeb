import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Admin.css';

export default function Admin({ profile, onHome, onLogout }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, grade, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin profile error:', error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setStudents(data || []);
    setLoading(false);
  }

  const studentUsers = students.filter(
    (student) => student.role !== 'admin'
  );

  const gradeCounts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  studentUsers.forEach((student) => {
    if (gradeCounts[student.grade] !== undefined) {
      gradeCounts[student.grade] += 1;
    }
  });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-label">KIDDOCATION</p>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">
            Manage students and monitor the system.
          </p>
        </div>

        <div className="admin-actions">
          <button type="button" onClick={onHome}>
            Home
          </button>

          <button
            type="button"
            className="admin-logout"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="admin-overview">

        <div className="admin-stat">
          <span className="admin-stat-label">
            TOTAL STUDENTS
          </span>

          <strong>
            {studentUsers.length}
          </strong>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">
            ADMINS
          </span>

          <strong>
            {students.filter((student) => student.role === 'admin').length}
          </strong>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">
            GRADE 1–6
          </span>

          <strong>
            {Object.values(gradeCounts).reduce(
              (total, count) => total + count,
              0
            )}
          </strong>
        </div>

      </section>

      <section className="admin-content">

        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Students</h2>
              <p>Registered Kiddocation users</p>
            </div>

            <button
              type="button"
              onClick={loadStudents}
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="admin-loading">
              Loading students...
            </div>
          ) : studentUsers.length === 0 ? (
            <div className="admin-empty">
              No student accounts yet.
            </div>
          ) : (
            <div className="student-table-wrapper">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Grade</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {studentUsers.map((student) => (
                    <tr key={student.id}>
                      <td>
                        {student.name || 'Unnamed Student'}
                      </td>

                      <td>
                        Grade {student.grade || '—'}
                      </td>

                      <td>
                        <span className="role-badge">
                          {student.role}
                        </span>
                      </td>

                      <td>
                        {new Date(
                          student.created_at
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Students by Grade</h2>
              <p>Current account distribution</p>
            </div>
          </div>

          <div className="grade-grid">
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <div
                className="grade-stat"
                key={grade}
              >
                <span>Grade {grade}</span>
                <strong>{gradeCounts[grade]}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-coming-soon">
          <h2>Scores & Game Management</h2>

          <p>
            Score monitoring, questions, game content,
            and progress management can be connected here
            once those database tables are implemented.
          </p>
        </div>

      </section>
    </main>
  );
}