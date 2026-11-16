import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { fetchLeaderboard } from '../lib/rooms';
import { rankTier } from '../lib/progress';
import './LeaderBoard.css';

const PERIODS = [
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}

// The RANKS tab: who has the most rank points.
export default function Leaderboard() {
  const [period, setPeriod] = useState('month');
  const [result, setResult] = useState({
    period: 'month',
    rows: [],
    loading: true,
    error: '',
  });

  useEffect(() => {
    let alive = true;

    fetchLeaderboard(period)
      .then((list) => {
        if (alive) {
          setResult({ period, rows: list || [], loading: false, error: '' });
        }
      })
      .catch((err) => {
        if (!alive) return;
        const message = err.message || 'Could not load the ranking.';
        setResult({
          period,
          rows: [],
          loading: false,
          error: message.includes('public.leaderboard')
            ? 'Ranking setup is incomplete. Ask your project administrator to apply the leaderboard migration from README.md.'
            : message,
        });
      });

    return () => {
      alive = false;
    };
  }, [period]);

  const rows = result.period === period ? result.rows : [];
  const error = result.period === period ? result.error : '';
  const loading = result.period !== period || result.loading;
  const me = rows.find((row) => row.is_me);
  const monthName = new Date().toLocaleString('en', { month: 'long' });

  return (
    <section className="lb" aria-label="Leaderboard">
      <h2 className="lb-title">RANKING</h2>

      <div className="lb-tabs" role="tablist">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={period === item.id}
            className={`lb-tab ${period === item.id ? 'is-active' : ''}`}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="lb-note">
        {period === 'month'
          ? `Rank points earned in ${monthName}. A new month starts fresh.`
          : 'All the rank points you have ever earned.'}
      </p>

      {error && <p className="lb-error">{error}</p>}

      {loading ? (
        <p className="lb-empty">Loading the ranking...</p>
      ) : rows.length === 0 ? (
        <p className="lb-empty">
          No ranked games yet {period === 'month' ? 'this month' : ''}. Play
          Ranked mode to get on the board!
        </p>
      ) : (
        <ol className="lb-list">
          {rows.map((row, index) => {
            const gap = index > 0 && row.place - rows[index - 1].place > 1;

            return (
              <li
                key={row.user_id}
                className={`lb-row lb-row--${row.place <= 3 ? 'top' : 'rest'} ${
                  row.is_me ? 'is-me' : ''
                } ${gap ? 'has-gap' : ''}`}
              >
                <span className="lb-row__place">{row.place}</span>
                <Avatar id={row.avatar_id} className="lb-row__avatar" />

                <span className="lb-row__who">
                  <span className="lb-row__name">
                    {row.name}
                    {row.is_me ? ' (you)' : ''}
                  </span>
                  <span className="lb-row__meta">
                    Level {row.level}
                    {period === 'all' ? ` · ${rankTier(row.points)}` : ''}
                    {` · ${row.games} game${row.games === 1 ? '' : 's'}`}
                  </span>
                </span>

                <span className="lb-row__points">{row.points}</span>
              </li>
            );
          })}
        </ol>
      )}

      {me && (
        <p className="lb-me">
          You are {ordinal(me.place)} with {me.points} rank points.
        </p>
      )}

      <p className="lb-help">
        Rank points come from Ranked games. Win a match against other players,
        or get most answers right in a solo run.
      </p>
    </section>
  );
}