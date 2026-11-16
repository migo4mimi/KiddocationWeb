import { useState } from 'react';
import { getPracticePacketSelection } from '../lib/lessons';
import { CATEGORIES, ROUND_CHOICES } from '../lib/progress';
import './Lobby.css';
import './Setup.css';

const TITLES = {
  ranked: 'RANKED MATCH',
  custom: 'CUSTOM GAME',
  practice: 'PRACTICE',
};

const BUTTONS = {
  ranked: 'FIND A MATCH',
  custom: 'CREATE ROOM',
  practice: 'START',
};

const NOTES = {
  ranked:
    '5 questions. You are matched with students who chose the same grade and category.',
  custom: 'You are the host. Friends join with your room code.',
  practice: 'Play alone at your own pace and choose how long each question lasts.',
};

const PRACTICE_TIME_CHOICES = [15, 30];
const MIN_CUSTOM_SECONDS = 5;
const MAX_CUSTOM_SECONDS = 120;

// maxGrade: the student's own grade. Players can choose that grade or lower.
export default function Setup({
  mode,
  maxGrade = 1,
  isAdmin = false,
  initial,
  busy = false,
  error = '',
  onConfirm,
  onViewPacket,
  onViewTutorial,
  onBack,
}) {
  const top = isAdmin ? 6 : Math.min(Math.max(Number(maxGrade) || 1, 1), 6);

  const [grade, setGrade] = useState(
    initial?.grade ? Math.min(initial.grade, top) : top
  );
  const [category, setCategory] = useState(initial?.category || 'addition');
  const [rounds, setRounds] = useState(initial?.rounds || 3);
  const [timeChoice, setTimeChoice] = useState(() => {
    if (!initial?.roundSeconds) return 15;
    return PRACTICE_TIME_CHOICES.includes(initial.roundSeconds)
      ? initial.roundSeconds
      : 'custom';
  });
  const [customSeconds, setCustomSeconds] = useState(() => (
    initial?.roundSeconds && !PRACTICE_TIME_CHOICES.includes(initial.roundSeconds)
      ? String(initial.roundSeconds)
      : '45'
  ));

  function chooseGrade(value) {
    if (value > top) return;

    setGrade(value);

    const current = CATEGORIES.find((item) => item.id === category);
    if (current && current.minGrade > value) {
      setCategory('addition');
    }
  }

  function selectedSettings() {
    return {
      grade,
      category,
      rounds,
      ...(mode === 'practice'
        ? {
            roundSeconds: timeChoice === 'custom'
              ? Number(customSeconds)
              : timeChoice,
          }
        : {}),
    };
  }

  function openPacket() {
    const base = selectedSettings();
    const packet = getPracticePacketSelection(base.grade, base.category);

    onViewPacket?.({
      ...base,
      grade: packet.grade,
      category: packet.category,
    });
  }

  return (
    <main className="lobby-page">
      <div className="lobby-column">
        <header className="lobby-header">
          <button
            type="button"
            className="lobby-back"
            onClick={onBack}
            aria-label="Go back"
          >
            ←
          </button>

          <div>
            <h1 className="lobby-title">{TITLES[mode]}</h1>
            <p className="lobby-subtitle">Choose what to play</p>
          </div>
        </header>

        {error && (
          <p className="lobby-error" role="alert">
            {error}
          </p>
        )}

        <section className="lobby-card">
          <h2 className="lobby-card__header">1. Choose your grade</h2>

          <div className="setup-grades">
            {[1, 2, 3, 4, 5, 6].map((value) => {
              const locked = value > top;

              return (
                <button
                  key={value}
                  type="button"
                  className={`setup-grade ${grade === value ? 'is-selected' : ''}`}
                  disabled={locked}
                  onClick={() => chooseGrade(value)}
                  aria-pressed={grade === value}
                >
                  <span className="setup-grade__label">GRADE</span>
                  <strong>{value}</strong>
                  {locked && <span className="setup-grade__lock">🔒</span>}
                </button>
              );
            })}
          </div>

          <p className="lobby-note">
            You can play your own grade or any grade below it.
          </p>
          <p className="lobby-note">
            Earn 10 PTS for each correct answer in every game mode.
          </p>
        </section>

        <section className="lobby-card">
          <h2 className="lobby-card__header">2. Choose a category</h2>

          <div className="setup-categories">
            {CATEGORIES.map((item) => {
              const locked = item.minGrade > grade;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`setup-category ${
                    category === item.id ? 'is-selected' : ''
                  }`}
                  disabled={locked}
                  onClick={() => setCategory(item.id)}
                  aria-pressed={category === item.id}
                >
                  <span className="setup-category__symbol">{item.symbol}</span>
                  <span className="setup-category__label">{item.label}</span>
                  {locked && (
                    <span className="setup-category__lock">
                      From Grade {item.minGrade}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {mode === 'practice' && (
          <section className="lobby-card">
            <h2 className="lobby-card__header">3. Choose time per question</h2>

            <div className="setup-rounds setup-time-choices">
              <button
                type="button"
                className={`setup-round ${timeChoice === 'custom' ? 'is-selected' : ''}`}
                onClick={() => setTimeChoice('custom')}
                aria-pressed={timeChoice === 'custom'}
              >
                Custom
              </button>
              {PRACTICE_TIME_CHOICES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`setup-round ${timeChoice === value ? 'is-selected' : ''}`}
                  onClick={() => setTimeChoice(value)}
                  aria-pressed={timeChoice === value}
                >
                  {value} seconds
                </button>
              ))}
            </div>

            {timeChoice === 'custom' && (
              <label className="setup-custom-time">
                Custom time
                <span>
                  <input
                    type="number"
                    min={MIN_CUSTOM_SECONDS}
                    max={MAX_CUSTOM_SECONDS}
                    step="1"
                    value={customSeconds}
                    onChange={(event) => setCustomSeconds(event.target.value)}
                    aria-describedby="setup-custom-time-note"
                  />
                  seconds per question
                </span>
                <small id="setup-custom-time-note">
                  Enter {MIN_CUSTOM_SECONDS}–{MAX_CUSTOM_SECONDS} seconds.
                </small>
              </label>
            )}
          </section>
        )}

        {mode !== 'ranked' && (
          <section className="lobby-card">
            <h2 className="lobby-card__header">
              {mode === 'practice' ? '4' : '3'}. Number of rounds
            </h2>

            <div className="setup-rounds">
              {ROUND_CHOICES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`setup-round ${rounds === value ? 'is-selected' : ''}`}
                  onClick={() => setRounds(value)}
                  aria-pressed={rounds === value}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="lobby-note lobby-note--card">{NOTES[mode]}</p>

        <div className="lobby-actions">
          {mode === 'practice' && onViewPacket && (
            <button
              type="button"
              className="lobby-button lobby-button--light"
              disabled={busy}
              onClick={openPacket}
            >
              LEARNING PACKET
            </button>
          )}

          <button
            type="button"
            className="lobby-button"
            disabled={
              busy
              || (
                mode === 'practice'
                && timeChoice === 'custom'
                && (
                  !Number.isInteger(Number(customSeconds))
                  || Number(customSeconds) < MIN_CUSTOM_SECONDS
                  || Number(customSeconds) > MAX_CUSTOM_SECONDS
                )
              )
            }
            onClick={() => onConfirm(selectedSettings())}
          >
            {BUTTONS[mode]}
          </button>
          {onViewTutorial && (
            <button
              type="button"
              className="lobby-button lobby-button--light"
              disabled={busy}
              onClick={() => onViewTutorial(selectedSettings())}
            >
              VIEW TUTORIAL AGAIN
            </button>
          )}
        </div>
      </div>
    </main>
  );
}