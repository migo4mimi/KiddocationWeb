import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { markTutorialSeen } from '../lib/tutorial';
import { saveTutorialCategoryToAccount } from '../lib/tutorialAccount';
import './Tutorial.css';

/* ---------- the little pictures ---------- */

function Board({ children, wide }) {
  return <div className={`tu-board ${wide ? 'tu-board--wide' : ''}`}>{children}</div>;
}

function Art({ name, avatarId, touch }) {
  if (name === 'question') {
    return (
      <div className="tu-art">
        <Board wide>3 + 4 = ?</Board>
        <div className="tu-timer">15 secs</div>
      </div>
    );
  }

  if (name === 'tiles') {
    return (
      <div className="tu-art">
        <div className="tu-row">
          <Board>6</Board>
          <Board>7</Board>
        </div>
        <div className="tu-row">
          <span className="tu-tile tu-tile--red">RED</span>
          <span className="tu-tile tu-tile--blue">BLUE</span>
        </div>
      </div>
    );
  }

  if (name === 'walk') {
    return (
      <div className="tu-art">
        <div className="tu-row tu-row--center">
          <span className="tu-key">{touch ? '👆' : '←'}</span>
          <Avatar id={avatarId} size={96} />
          <span className="tu-key">{touch ? '👆' : '→'}</span>
        </div>
        <div className="tu-row">
          <span className="tu-tile tu-tile--red">RED</span>
          <span className="tu-tile tu-tile--blue">BLUE</span>
        </div>
      </div>
    );
  }

  if (name === 'result') {
    return (
      <div className="tu-art tu-art--row">
        <div className="tu-badge tu-badge--good">
          <b>✓</b>
          <span>Correct</span>
        </div>
        <div className="tu-badge tu-badge--bad">
          <b>✕</b>
          <span>Try again</span>
        </div>
      </div>
    );
  }

  if (name === 'confirm') {
    return (
      <div className="tu-art">
        <Board wide>Choose red or blue</Board>
        <span className="tu-confirm-example">CONFIRM ANSWER · ENTER</span>
      </div>
    );
  }

  if (name === 'points') {
    return (
      <div className="tu-art">
        <div className="tu-badge tu-badge--good">
          <b>✓</b>
          <span>+10 PTS</span>
        </div>
        <span className="tu-points-note">for each correct answer</span>
      </div>
    );
  }

  return (
    <div className="tu-art">
      <div className="tu-levelbar">
        <span />
      </div>
      <div className="tu-row tu-row--center">
        <span className="tu-pill">LEVEL UP!</span>
        <span className="tu-pill tu-pill--green">PTS</span>
      </div>
    </div>
  );
}

// "How to play": a step-by-step guide shown before the first game.
export default function Tutorial({
  avatarId,
  userId,
  category,
  categoryName,
  onDone,
}) {
  const [step, setStep] = useState(0);
  const [saveError, setSaveError] = useState('');

  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  useEffect(() => {
    let active = true;
    markTutorialSeen(userId, category);

    saveTutorialCategoryToAccount(category).catch((error) => {
      console.error('Could not save tutorial progress:', error);
      if (active) {
        setSaveError('This tutorial is saved on this device, but could not be synced to your account.');
      }
    });

    return () => {
      active = false;
    };
  }, [userId, category]);

  const SLIDES = [
    {
      art: 'question',
      title: `1. Read the ${categoryName || 'math'} question`,
      text: 'A math problem appears on the board at the start of every round. Read the whole question first, then work out the answer before moving.',
    },
    {
      art: 'tiles',
      title: '2. Match the answer to a tile',
      text: 'There are two possible answers. The answer on the left matches the red tile. The answer on the right matches the blue tile. Pick the tile with the correct number.',
    },
    {
      art: 'walk',
      title: '3. Walk to your answer',
      text: touch
        ? 'Tap or drag on the game to move your avatar. Keep moving until your avatar is standing on the red or blue tile you chose.'
        : 'Click or drag on the game to move. You can also use the arrow keys or W A S D. Walk your avatar onto the tile with the answer you chose.',
    },
    {
      art: 'walk',
      title: '4. Check where you are standing',
      text: 'Your answer is the tile underneath your avatar when you confirm or when the timer ends. Move fully onto a tile; standing between the two tiles will count as no answer.',
    },
    {
      art: 'confirm',
      title: '5. Confirm when you are ready',
      text: 'You do not have to wait for the timer to run out. Once you are on a tile, press CONFIRM ANSWER or Enter to submit it right away. After confirming, you cannot change that answer.',
    },
    {
      art: 'result',
      title: '6. Learn from the result',
      text: 'A green check means your answer was right. A red X means it was not. If you miss a question, look at both choices and think about how to solve it next time.',
    },
    {
      art: 'points',
      title: '7. Earn points in every mode',
      text: 'Finish a game to earn 10 points for each correct answer in Practice, Ranked, and Custom. Your total is added after the game.',
    },
    {
      art: 'level',
      title: '8. Build your progress',
      text: 'Games also give you experience (XP) toward the next level. Try Practice to learn at your own pace, Ranked to compete, or Custom to play with friends.',
    },
  ];

  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  function finish() {
    onDone();
  }

  return (
    <main className="tu">
      <div className="tu-card">
        <button type="button" className="tu-skip" onClick={finish}>
          Skip
        </button>

        <Art name={slide.art} avatarId={avatarId} touch={touch} />

        <h1 className="tu-title">{slide.title}</h1>
        <p className="tu-text">{slide.text}</p>
        {saveError && <p className="tu-error" role="alert">{saveError}</p>}

        <div className="tu-dots" aria-hidden="true">
          {SLIDES.map((item, i) => (
            <span key={item.art} className={i === step ? 'is-on' : ''} />
          ))}
        </div>

        <div className="tu-buttons">
          {step > 0 && (
            <button
              type="button"
              className="tu-button tu-button--light"
              onClick={() => setStep(step - 1)}
            >
              BACK
            </button>
          )}

          <button
            type="button"
            className="tu-button"
            onClick={() => (last ? finish() : setStep(step + 1))}
          >
            {last ? 'GOT IT!' : 'NEXT'}
          </button>
        </div>
      </div>
    </main>
  );
}