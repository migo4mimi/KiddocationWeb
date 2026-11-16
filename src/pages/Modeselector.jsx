import RankEmblem from './RankEmblem';
import './Modeselector.css';

// The mode selector from the Figma Home screens.
//   Ranked:           [ RANKED ] [ play button ] [ MODE ]
//   Practice, Custom: [   PRACTICE (wide)     ]  [ MODE ]
// "MODE" goes to the next mode. Press the play button (or the big tile) to start.
export default function ModeSelector({ modes, index, onChange, onPlay, rank }) {
  const current = modes[index];
  const next = modes[(index + 1) % modes.length];
  const wide = current.id !== 'ranked';

  return (
    <div className={`ms ${wide ? 'is-wide' : ''}`}>
      <button
        type="button"
        className="ms-tile ms-tile--main"
        onClick={onPlay}
        aria-label={`Play ${current.label.toLowerCase()} mode`}
      >
        <span>
          {wide ? '▶ ' : ''}
          {current.label}
        </span>
      </button>

      <button
        type="button"
        className="ms-tile ms-tile--center"
        onClick={onPlay}
        tabIndex={wide ? -1 : 0}
        aria-hidden={wide}
        aria-label={`Play ${current.label.toLowerCase()} mode`}
      />

      <button
        type="button"
        className="ms-tile ms-tile--right"
        onClick={() => onChange((index + 1) % modes.length)}
        aria-label={`Next mode: ${next.label.toLowerCase()}`}
      >
        <span>MODE</span>
      </button>

      <button
        type="button"
        className="ms-play"
        onClick={onPlay}
        tabIndex={wide ? -1 : 0}
        aria-hidden={wide}
        aria-label={`Play ${current.label.toLowerCase()} mode`}
      >
        <RankEmblem rank={rank} className="ms-play__rank" />
      </button>
    </div>
  );
}