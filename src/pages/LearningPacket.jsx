import { useEffect, useState } from 'react';
import { getLesson } from '../lib/lessons';
import { getLearningVideo } from '../lib/learningVideos';
import './LearningPacket.css';

// A row of little squares. `gone` squares are faded and crossed out.
function Squares({ count, tone = 'dark', gone = 0 }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={`lp-sq lp-sq--${tone} ${i >= count - gone ? 'is-gone' : ''}`}
    />
  ));
}

// The counting picture for the lesson.
function Visual({ visual }) {
  if (!visual) return null;

  if (visual.type === 'add') {
    return (
      <div className="lp-visual">
        <div className="lp-group">
          <Squares count={visual.a} />
        </div>
        <span className="lp-sign">+</span>
        <div className="lp-group">
          <Squares count={visual.b} tone="light" />
        </div>
        <span className="lp-sign">=</span>
        <strong className="lp-total">{visual.a + visual.b}</strong>
      </div>
    );
  }

  if (visual.type === 'sub') {
    return (
      <div className="lp-visual">
        <div className="lp-group">
          <Squares count={visual.a} gone={visual.b} />
        </div>
        <span className="lp-sign">−</span>
        <strong className="lp-total">{visual.b}</strong>
        <span className="lp-sign">=</span>
        <strong className="lp-total">{visual.a - visual.b}</strong>
      </div>
    );
  }

  if (visual.type === 'mul') {
    return (
      <div className="lp-visual">
        <div
          className="lp-grid"
          style={{ gridTemplateColumns: `repeat(${visual.cols}, 1fr)` }}
        >
          <Squares count={visual.rows * visual.cols} />
        </div>
        <strong className="lp-total">
          {visual.rows} × {visual.cols} = {visual.rows * visual.cols}
        </strong>
      </div>
    );
  }

  // division: share the squares equally
  const each = visual.total / visual.groups;

  return (
    <div className="lp-visual">
      {Array.from({ length: visual.groups }, (_, i) => (
        <div key={i} className="lp-group lp-group--box">
          <Squares count={each} tone={i % 2 ? 'light' : 'dark'} />
        </div>
      ))}
      <strong className="lp-total">
        {visual.total} ÷ {visual.groups} = {each}
      </strong>
    </div>
  );
}

function Chip({ icon, children }) {
  return (
    <div className="lp-chip">
      <span className="lp-chip__icon" aria-hidden="true">
        {icon}
      </span>
      <h2>{children}</h2>
    </div>
  );
}

// The learning packet: a short lesson before you practice.
export default function LearningPacket({
  grade,
  category,
  onBack,
  onPlay,
  playLabel = 'PLAY',
}) {
  const lesson = getLesson(grade, category);
  const video = getLearningVideo(grade, category, import.meta.env.BASE_URL);
  const [progress, setProgress] = useState(0);
  const [continuing, setContinuing] = useState(false);
  const [continueError, setContinueError] = useState('');
  const [videoError, setVideoError] = useState(false);

  // The bar at the top fills as you read down the page.
  useEffect(() => {
    window.scrollTo(0, 0);

    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  async function continueFromPacket() {
    setContinueError('');
    setContinuing(true);

    try {
      const result = await onPlay?.();
      if (result?.error) setContinueError(result.error);
    } catch (error) {
      setContinueError(
        error instanceof Error ? error.message : 'Could not continue. Please try again.'
      );
    } finally {
      setContinuing(false);
    }
  }

  if (!lesson) {
    return (
      <main className="lp">
        <div className="lp-column">
          <p className="lp-footer">There is no lesson for this choice yet.</p>
          <button type="button" className="lp-play" onClick={onBack}>
            BACK
          </button>
        </div>
      </main>
    );
  }

  const { example } = lesson;

  return (
    <main className="lp">
      <div className="lp-topbar">
        {onBack && (
          <button type="button" className="lp-back" onClick={onBack} aria-label="Back">
            ←
          </button>
        )}
        <div className="lp-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="lp-column">
        <header className="lp-hero">
          <span className="lp-hero__chip">MATH • {lesson.level}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.intro}</p>
        </header>

        {lesson.visual && (
          <section className="lp-card">
            <Chip icon="👀">See it</Chip>
            <div className="lp-panel">
              <Visual visual={lesson.visual} />
            </div>
          </section>
        )}

        <section className="lp-card">
          <Chip icon="👣">Steps</Chip>
          <ol className="lp-steps">
            {lesson.steps.map((step, i) => (
              <li key={step} className="lp-panel lp-step">
                <span className="lp-step__number">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-card">
          <Chip icon="✨">Example</Chip>
          <div className="lp-example">
            <span className="lp-example__sum">
              {example.a} {example.op} {example.b} = <b>{example.answer}</b>
            </span>
          </div>
          <p className="lp-text">{example.note}</p>
        </section>

        <section className="lp-card">
          <Chip icon="⭐">Remember</Chip>
          {lesson.tips.map((tip) => (
            <p key={tip.bold} className="lp-callout">
              <strong>{tip.bold}</strong> {tip.text}
            </p>
          ))}
        </section>

        <section className="lp-card">
          <Chip icon="🎯">Challenge</Chip>
          <p className="lp-callout">
            <strong>Challenge</strong>: {lesson.challenge}
          </p>
        </section>

        {video && (
          <section className="lp-card lp-video">
            <Chip icon="▶">Watch and learn</Chip>
            <p className="lp-text">{video.title}</p>
            {videoError ? (
              <p className="lp-video__missing" role="status">
                This video is unavailable or unsupported. Check that its MP4 exists at{' '}
                <code>public/videos/{video.fileName}</code>.
              </p>
            ) : (
              <div className="lp-video__frame">
                <video
                  key={video.src}
                  controls
                  playsInline
                  preload="metadata"
                  muted={false}
                  onError={() => setVideoError(true)}
                >
                  <source src={video.src} type="video/mp4" />
                  Your browser does not support MP4 video.
                </video>
              </div>
            )}
          </section>
        )}

        {continueError && (
          <p className="lp-continue-error" role="alert">
            {continueError}
          </p>
        )}

        <button
          type="button"
          className={`lp-play ${playLabel.length > 10 || continuing ? 'lp-play--long' : ''}`}
          onClick={continueFromPacket}
          disabled={continuing}
        >
          {continuing ? 'PLEASE WAIT...' : playLabel}
        </button>

        <p className="lp-footer">
          Made for little learners • One small step at a time 🌟
        </p>
      </div>
    </main>
  );
}