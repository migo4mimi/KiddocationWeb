import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Avatar, { SvgAvatar } from './Avatar';
import {
  awardGamePoints,
  confirmRoomAnswer,
  fetchPlayers,
  fetchQuestions,
  fetchRoomConfirmationStatus,
  fetchRoom,
  finishRoom,
  serverNow,
  syncClock,
} from '../lib/rooms';
import {
  categoryLabel,
  levelInfo,
} from '../lib/progress';
import { avatarForPlayer } from '../lib/playerAvatar';
import { playSfx, vibrate } from '../lib/feedback';
import { getPrefs } from '../lib/prefs';
import { getAutomaticAnswerSubmissionResult } from '../lib/gameAnswerSubmission';
import { localCalendarDate } from '../lib/streak';
import './Game.css';

/* =========================================================
   THE PLATFORM
   Everything is drawn in the Figma frame size (412 x 917).
   u = left to right on the platform (0 to 1)
   v = near to far on the platform (0 to 1)
========================================================= */

const DESIGN_W = 412;
const DESIGN_H = 917;

const FAR_Y = 478;
const NEAR_Y = 697;
const DEPTH = NEAR_Y - FAR_Y;
const FAR_LEFT = 75;
const FAR_RIGHT = 340;
const NEAR_LEFT = -31;
const NEAR_RIGHT = 432;

const WALK_SPEED = 240; // design pixels per second

// The red tile is under the left answer, the blue tile under the right one.
const ZONES = {
  red: { u0: 0.06, u1: 0.46, v0: 0.78, v1: 1 },
  blue: { u0: 0.54, u1: 0.94, v0: 0.78, v1: 1 },
};

const START = { u: 0.5, v: 0.18 };

// Camera (every mode): while a round is running the view zooms in and follows
// the avatar everywhere it walks, then zooms out when the round is over.
// The question and the two answers are also shown at the top of the screen
// while zoomed in, so they never go out of view.
// Turn it off in Settings > Game > Camera Zoom. Bigger number = closer.
const CAMERA_ZOOM = 1.8;
const FULL_VIEW = { zoom: 1, x: 0, y: 0 };

function cameraEnabled() {
  return getPrefs().cameraZoom !== false;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function edges(v) {
  return {
    left: NEAR_LEFT + (FAR_LEFT - NEAR_LEFT) * v,
    right: NEAR_RIGHT + (FAR_RIGHT - NEAR_RIGHT) * v,
  };
}

function widthAt(v) {
  const { left, right } = edges(v);
  return right - left;
}

function project(u, v) {
  const { left, right } = edges(v);
  return { x: left + u * (right - left), y: NEAR_Y - DEPTH * v };
}

function zonePoints(zone) {
  return [
    project(zone.u0, zone.v0),
    project(zone.u1, zone.v0),
    project(zone.u1, zone.v1),
    project(zone.u0, zone.v1),
  ]
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
}

function zoneAt(u, v) {
  const names = Object.keys(ZONES);

  for (let i = 0; i < names.length; i += 1) {
    const zone = ZONES[names[i]];

    if (u >= zone.u0 && u <= zone.u1 && v >= zone.v0 && v <= zone.v1) {
      return names[i];
    }
  }

  return null;
}

const KEY_MAP = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
};

function resultMessage(correct, total) {
  if (correct === total) return 'Perfect!';
  if (correct === 0) return 'Try again!';
  if (correct / total >= 0.6) return 'Great job!';
  return 'Not bad';
}

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}

/* =========================================================
   SMALL ICONS
========================================================= */

function CheckIcon() {
  return (
    <svg viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="70" r="70" fill="#0a9f00" />
      <path
        d="M39 77 L61 99 L103 51"
        fill="none"
        stroke="#046300"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 71 L58 93 L100 45"
        fill="none"
        stroke="#ffffff"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="70" r="70" fill="#ffffff" />
      <path
        d="M46 46 L94 94 M94 46 L46 94"
        fill="none"
        stroke="#ff3b3b"
        strokeWidth="18"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 110 110" aria-hidden="true">
      <defs>
        <linearGradient id="game-star-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd84d" />
          <stop offset="1" stopColor="#ffb300" />
        </linearGradient>
      </defs>
      <polygon
        points="50,12 61,40 91,42 68,61 76,90 50,74 24,90 32,61 9,42 39,40"
        fill="url(#game-star-fill)"
        stroke="url(#game-star-fill)"
        strokeWidth="9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   WHAT YOU EARNED (XP and level)
========================================================= */

function Earned({ me, summary, showRank }) {
  const gained = me?.xp_gained ?? 0;
  const leveledUp = summary.after.level > summary.before.level;

  return (
    <div className="game-earned">
      <span className="game-earned__xp">+{gained} XP</span>

      {showRank && me?.rank_change !== 0 && (
        <span className="game-earned__rank">
          {me.rank_change > 0 ? '+' : ''}
          {me.rank_change} rank pts
        </span>
      )}

      {leveledUp ? (
        <strong className="game-earned__level">
          LEVEL UP! You are Level {summary.after.level}
        </strong>
      ) : (
        <span className="game-earned__bar" aria-hidden="true">
          <span style={{ width: `${summary.after.percent}%` }} />
        </span>
      )}
    </div>
  );
}

/* =========================================================
   THE GAME
========================================================= */

export default function Game({
  roomId,
  profileAvatarId,
  onExit,
  onPlayAgain,
  onRefreshProfile,
}) {
  const [room, setRoom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [now, setNow] = useState(() => serverNow());
  const [renderedPosition, setRenderedPosition] = useState({
    round: 0,
    pos: START,
  });
  const [moving, setMoving] = useState(false);
  const [outcomes, setOutcomes] = useState({});
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [confirmedRounds, setConfirmedRounds] = useState({});
  const [confirmingRounds, setConfirmingRounds] = useState({});
  const [summary, setSummary] = useState(null);
  const [answerErrors, setAnswerErrors] = useState({});
  const [rewardError, setRewardError] = useState('');
  const [cam, setCam] = useState(FULL_VIEW);
  const [facing, setFacing] = useState('right');
  const [touch] = useState(
    () => window.matchMedia?.('(pointer: coarse)').matches ?? false
  );

  const svgRef = useRef(null);
  const camRef = useRef(FULL_VIEW);
  const phaseRef = useRef('loading');
  const facingRef = useRef('right');
  const zoomOnRef = useRef(false);
  const posRef = useRef(START);
  const targetRef = useRef(null);
  const keysRef = useRef(new Set());
  const draggingRef = useRef(false);
  const submittedRef = useRef(new Set());
  const confirmedRef = useRef(new Set());
  const confirmRef = useRef(() => {});
  const endedRef = useRef(false);
  const feedbackTimeoutRef = useRef(null);

  function showAnswerFeedback(outcome) {
    setAnswerFeedback(outcome);
    window.clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setAnswerFeedback(null);
    }, 1500);
  }

  useEffect(
    () => () => window.clearTimeout(feedbackTimeoutRef.current),
    []
  );

  /* ---------- load the game ---------- */

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        await syncClock();
        const { data } = await supabase.auth.getUser();
        const [roomData, list] = await Promise.all([
          fetchRoom(roomId),
          fetchQuestions(roomId),
        ]);

        if (!alive) return;

        if (!roomData.room) {
          setLoadError('This game could not be found.');
          return;
        }

        setUserId(data?.user?.id ?? null);
        setRoom(roomData.room);
        setPlayers(roomData.players);
        setQuestions(list);
      } catch (err) {
        if (alive) setLoadError(err.message);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [roomId]);

  // A clock that matches the server.
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 100);
    return () => clearInterval(timer);
  }, []);

  // Keyboard: arrow keys or W A S D.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmRef.current();
        return;
      }

      const direction = KEY_MAP[event.key];
      if (!direction || confirmedRef.current.size > 0) return;
      event.preventDefault();
      keysRef.current.add(direction);
    }

    function handleKeyUp(event) {
      const direction = KEY_MAP[event.key];
      if (direction) keysRef.current.delete(direction);
    }

    function clearKeys() {
      keysRef.current.clear();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  /* ---------- where are we in the game? ---------- */
  // Every player's phone uses the same server clock, so everyone sees the
  // same round at the same time (and a refresh puts you back in the game).

  let phase = 'loading';
  let index = 0;
  let within = 0;
  let roundMs = 0;

  if (room) {
    roundMs = room.round_seconds * 1000;
    const stepMs = (room.round_seconds + room.reveal_seconds) * 1000;
    const elapsed = now - new Date(room.started_at).getTime();

    if (elapsed < 0) {
      phase = 'countdown';
    } else {
      index = Math.floor(elapsed / stepMs);

      if (index >= room.total_rounds) {
        phase = 'ended';
        index = room.total_rounds - 1;
      } else {
        within = elapsed - index * stepMs;
        phase = within < roundMs ? 'playing' : 'reveal';
      }
    }
  }

  const isPractice = room?.mode === 'practice';
  const pos = renderedPosition.round === index ? renderedPosition.pos : START;

  // Practice, or a ranked run where you are the only player: no standings.
  const single =
    isPractice || (summary ? summary.players.length : players.length) <= 1;
  const question = questions.find((item) => item.round === index);

  const [confirmationStatus, setConfirmationStatus] = useState(null);
  const [confirmationStatusError, setConfirmationStatusError] = useState(null);

  useEffect(() => {
    if (phase !== 'playing' || single) return undefined;

    let active = true;
    let loading = false;
    let hasLoggedError = false;

    async function refreshConfirmationStatus() {
      if (loading) return;
      loading = true;

      try {
        const status = await fetchRoomConfirmationStatus(roomId, index);
        if (active) {
          setConfirmationStatus({ ...status, round: index });
          setConfirmationStatusError(null);
        }
      } catch (error) {
        if (active) {
          setConfirmationStatusError({
            round: index,
            message: 'Player confirmations are unavailable.',
          });
          if (!hasLoggedError) {
            console.error('Could not load player confirmation status:', error);
            hasLoggedError = true;
          }
        }
      } finally {
        loading = false;
      }
    }

    refreshConfirmationStatus();
    const timer = window.setInterval(refreshConfirmationStatus, 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [roomId, index, phase, single]);

  useEffect(() => {
    phaseRef.current = phase;
    zoomOnRef.current = Boolean(room) && cameraEnabled();
  }, [phase, room]);

  // Sounds: a beep for the last 3 seconds and a start tune for each round.
  const secondsToGo =
    phase === 'playing' ? Math.max(0, Math.ceil((roundMs - within) / 1000)) : 0;

  useEffect(() => {
    if (phase === 'playing' && secondsToGo > 0 && secondsToGo <= 3) {
      playSfx('tick');
    }
  }, [phase, secondsToGo]);

  useEffect(() => {
    if (phase === 'playing') playSfx('go');
  }, [phase, index]);

  useEffect(() => {
    if (summary) playSfx('win');
  }, [summary]);

  // A new round: the avatar goes back to the start.
  useEffect(() => {
    posRef.current = START;
    targetRef.current = null;
    confirmedRef.current.clear();
  }, [index]);

  async function confirmAnswer() {
    if (phase !== 'playing' || submittedRef.current.has(index)) return;

    submittedRef.current.add(index);
    confirmedRef.current.add(index);
    keysRef.current.clear();
    targetRef.current = null;
    setMoving(false);
    setAnswerErrors((previous) => ({ ...previous, [index]: '' }));
    setConfirmingRounds((previous) => ({ ...previous, [index]: true }));

    const round = index;
    const side = zoneAt(posRef.current.u, posRef.current.v) || 'none';

    try {
      const correct = await confirmRoomAnswer(roomId, round, side);
      playSfx(correct ? 'correct' : 'wrong');
      vibrate(correct ? 60 : [120, 60, 120]);
      setConfirmedRounds((previous) => ({ ...previous, [round]: true }));
      setOutcomes((previous) => ({
        ...previous,
        [round]: correct ? 'correct' : 'wrong',
      }));
      showAnswerFeedback(correct ? 'correct' : 'wrong');
    } catch (error) {
      submittedRef.current.delete(round);
      confirmedRef.current.delete(round);
      setAnswerErrors((previous) => ({
        ...previous,
        [round]: error.message || 'Could not confirm your answer. Try again.',
      }));
    } finally {
      setConfirmingRounds((previous) => ({ ...previous, [round]: false }));
    }
  }

  async function submitAutomaticAnswer(round, side) {
    let submissionError;
    setConfirmingRounds((previous) => ({ ...previous, [round]: true }));

    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const correct = await confirmRoomAnswer(roomId, round, side);
          const result = getAutomaticAnswerSubmissionResult(round, correct);
          playSfx(result.outcome);
          vibrate(result.outcome === 'correct' ? 60 : [120, 60, 120]);

          setOutcomes((previous) => ({
            ...previous,
            [round]: result.outcome,
          }));
          if (result.outcome) showAnswerFeedback(result.outcome);
          setAnswerErrors((previous) => ({ ...previous, [round]: '' }));
          return;
        } catch (error) {
          submissionError = error;
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
          }
        }
      }

      submittedRef.current.delete(round);
      const result = getAutomaticAnswerSubmissionResult(round, false, submissionError);
      setAnswerErrors((previous) => ({
        ...previous,
        [round]: result.error,
      }));
    } finally {
      setConfirmingRounds((previous) => ({ ...previous, [round]: false }));
    }
  }

  useEffect(() => {
    confirmRef.current = confirmAnswer;
  });

  // Turn the avatar to look left or right.
  function face(direction) {
    if (facingRef.current !== direction) {
      facingRef.current = direction;
      setFacing(direction);
    }
  }

  // Moves the avatar while a round is running.
  useEffect(() => {
    if (phase !== 'playing') return undefined;

    let frame;
    let last = performance.now();

    function tick(time) {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;

      const keys = keysRef.current;
      const step = WALK_SPEED * dt;
      let { u, v } = posRef.current;
      let walking = false;

      const dirX = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      const dirY = (keys.has('up') ? 1 : 0) - (keys.has('down') ? 1 : 0);

      if (dirX !== 0 || dirY !== 0) {
        const length = Math.hypot(dirX, dirY);
        targetRef.current = null;
        u = clamp(u + ((dirX / length) * step) / widthAt(v), 0, 1);
        v = clamp(v + ((dirY / length) * step) / DEPTH, 0, 1);
        walking = true;
        if (dirX !== 0) face(dirX > 0 ? 'right' : 'left');
      } else if (targetRef.current) {
        const target = targetRef.current;
        const dx = (target.u - u) * widthAt(v);
        const dy = (target.v - v) * DEPTH;
        const distance = Math.hypot(dx, dy);

        if (distance <= step) {
          u = target.u;
          v = target.v;
          targetRef.current = null;
        } else {
          u += ((dx / distance) * step) / widthAt(v);
          v += ((dy / distance) * step) / DEPTH;
          walking = true;
          if (Math.abs(dx) > 1) face(dx > 0 ? 'right' : 'left');
        }
      }

      posRef.current = { u, v };
      setRenderedPosition((previous) =>
        previous.round === index &&
        previous.pos.u === u &&
        previous.pos.v === v
          ? previous
          : { round: index, pos: { u, v } }
      );
      setMoving((previous) => (previous === walking ? previous : walking));

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [phase, index]);

  // The camera: zooms in on the avatar during a round, zooms out after it.
  useEffect(() => {
    let frame;
    let last = performance.now();

    function tick(time) {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;

      let target = FULL_VIEW;

      if (zoomOnRef.current && phaseRef.current === 'playing') {
        const w = DESIGN_W / CAMERA_ZOOM;
        const h = DESIGN_H / CAMERA_ZOOM;
        const feet = project(posRef.current.u, posRef.current.v);

        // Keep the avatar in the middle, but never show past the edges.
        target = {
          zoom: CAMERA_ZOOM,
          x: clamp(feet.x - w / 2, -30, DESIGN_W + 30 - w),
          y: clamp(feet.y - h * 0.62, 0, DESIGN_H - h),
        };
      }

      const current = camRef.current;
      const ease = 1 - Math.exp(-dt * 6);

      let next = {
        zoom: current.zoom + (target.zoom - current.zoom) * ease,
        x: current.x + (target.x - current.x) * ease,
        y: current.y + (target.y - current.y) * ease,
      };

      const settled =
        Math.abs(next.zoom - target.zoom) < 0.002 &&
        Math.abs(next.x - target.x) < 0.2 &&
        Math.abs(next.y - target.y) < 0.2;

      if (settled) {
        next = target;
      }

      if (
        next.zoom !== current.zoom ||
        next.x !== current.x ||
        next.y !== current.y
      ) {
        camRef.current = next;
        setCam(next);
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, []);

  // The round is over: send the answer (the server checks it).
  useEffect(() => {
    if (phase !== 'reveal') return;
    if (submittedRef.current.has(index)) return;

    submittedRef.current.add(index);

    const side = zoneAt(posRef.current.u, posRef.current.v) || 'none';
    const round = index;

    keysRef.current.clear();
    targetRef.current = null;
    setMoving(false);

    submitAutomaticAnswer(round, side);
  }, [phase, index, roomId]);

  // Keep the shared round and player scores up to date.
  useEffect(() => {
    if (!room) return undefined;
    if (phase !== 'playing' && phase !== 'reveal') return undefined;

    const timer = setInterval(() => {
      Promise.all([
        fetchPlayers(roomId),
        supabase
          .from('rooms')
          .select('started_at, status')
          .eq('id', roomId)
          .maybeSingle(),
      ])
        .then(([nextPlayers, roomResult]) => {
        setPlayers(nextPlayers);
        if (roomResult.error) throw roomResult.error;
        if (roomResult.data) {
          setRoom((current) => ({ ...current, ...roomResult.data }));
        }
        })
        .catch((error) => {
          console.error('Could not refresh game progress:', error);
        });
    }, 800);

    return () => clearInterval(timer);
  }, [room, phase, roomId]);

  // After the last round: close the game, give the rewards, show the results.
  useEffect(() => {
    if (phase !== 'ended' || endedRef.current) return;

    endedRef.current = true;

    async function wrapUp() {
      let status = '';
      let finishError = '';
      let roomData = null;

      for (let attempt = 0; attempt < 6 && status !== 'finished'; attempt += 1) {
        try {
          await finishRoom(roomId);
        } catch (error) {
          finishError = error.message || 'The game could not be finalized.';
        }

        try {
          roomData = await fetchRoom(roomId);
          status = roomData.room?.status || '';
          if (status === 'finished') finishError = '';
        } catch (error) {
          finishError = error.message || 'The game status could not be checked.';
        }

        if (status !== 'finished') {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      if (status !== 'finished') {
        setRewardError(
          `Your game ended, but rewards could not be finalized. ${
            finishError || 'Please try again.'
          }`
        );
      }

      try {
        if (!roomData) roomData = await fetchRoom(roomId);
        let pointsEarned = 0;
        let pointsAwarded = false;
        let pointsTotal = null;

        if (status === 'finished') {
          try {
            pointsEarned = await awardGamePoints(roomId);
            pointsAwarded = true;
          } catch (error) {
            setRewardError((previous) => [
              previous,
              `Your score was saved, but points could not be awarded: ${error.message}`,
            ].filter(Boolean).join(' '));
          }

          if (pointsAwarded) {
            try {
              const { data: updatedProfile, error: profileError } = await supabase
                .from('profiles')
                .select('points')
                .eq('id', userId)
                .maybeSingle();
              if (profileError) throw profileError;
              pointsTotal = updatedProfile?.points ?? 0;
            } catch (error) {
              setRewardError((previous) => [
                previous,
                `Your points were awarded, but your balance could not be refreshed: ${error.message}`,
              ].filter(Boolean).join(' '));
            }

            try {
              await onRefreshProfile?.();
            } catch (error) {
              setRewardError((previous) => [
                previous,
                `Your points were awarded, but your profile could not be refreshed: ${error.message}`,
              ].filter(Boolean).join(' '));
            }
          }
        }

        if (status === 'finished') {
          const { error: streakError } = await supabase.rpc('record_game_activity', {
            p_room: roomId,
            p_activity_date: localCalendarDate(),
          });
          if (streakError) {
            setRewardError((previous) => [
              previous,
              `Your game was saved, but your daily streak could not be updated: ${streakError.message}`,
            ].filter(Boolean).join(' '));
          }
        }

        const list = [...roomData.players].sort(
          (a, b) => (a.place ?? 99) - (b.place ?? 99) || b.score - a.score
        );
        const me = list.find((player) => player.user_id === userId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', userId)
          .maybeSingle();
        if (profileError) throw profileError;
        const after = profile?.xp ?? 0;
        const gained = me?.xp_gained ?? 0;

        setSummary({
          players: list,
          before: levelInfo(Math.max(0, after - gained)),
          after: levelInfo(after),
          totalQuestions: roomData.room?.total_rounds ?? 0,
          correctAnswers: me?.correct ?? 0,
          pointsEarned,
          pointsAwarded,
          pointsTotal,
        });
      } catch {
        setLoadError('We could not load your results.');
      }
    }

    wrapUp();
  }, [phase, roomId, userId, onRefreshProfile]);

  /* ---------- tap or drag on the screen ---------- */

  // Where the pointer is, in the game's own coordinates.
  function pointerSpot(event) {
    const rect = svgRef.current.getBoundingClientRect();
    const view = camRef.current;

    return {
      x: view.x + ((event.clientX - rect.left) / rect.width) * (DESIGN_W / view.zoom),
      y: view.y + ((event.clientY - rect.top) / rect.height) * (DESIGN_H / view.zoom),
    };
  }

  // The avatar looks toward the mouse or finger.
  function lookAtPointer(event) {
    if (phase !== 'playing' || confirmedRef.current.has(index) || !svgRef.current) return;

    const spot = pointerSpot(event);
    const feet = project(posRef.current.u, posRef.current.v);

    if (Math.abs(spot.x - feet.x) > 6) {
      face(spot.x > feet.x ? 'right' : 'left');
    }
  }

  function moveToPointer(event) {
    if (phase !== 'playing' || confirmedRef.current.has(index) || !svgRef.current) return;

    const { x, y } = pointerSpot(event);

    const v = clamp((NEAR_Y - y) / DEPTH, 0, 1);
    const { left, right } = edges(v);
    const u = clamp((x - left) / (right - left), 0, 1);

    targetRef.current = { u, v };
  }

  function handlePointerDown(event) {
    draggingRef.current = true;
    lookAtPointer(event);
    moveToPointer(event);
  }

  function handlePointerMove(event) {
    lookAtPointer(event);
    if (draggingRef.current) moveToPointer(event);
  }

  function stopDragging() {
    draggingRef.current = false;
  }

  /* ---------- LOADING AND PROBLEMS ---------- */

  if (loadError && !summary) {
    return (
      <main className="game-page">
        <div className="game-frame">
          <div className="game-scene game-scene--result">
            <p className="game-problem">{loadError}</p>
            <button type="button" className="game-exit-button" onClick={onExit}>
              EXIT
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="game-page">
        <div className="game-frame">
          <div className="game-scene game-scene--result">
            <p className="game-problem">Loading your game...</p>
          </div>
        </div>
      </main>
    );
  }

  const me = players.find((player) => player.user_id === userId);
  const gradeText = `GRADE ${room.grade}`;
  const categoryText = categoryLabel(room.category).toUpperCase();

  /* ---------- RESULTS ---------- */

  if (phase === 'ended' && !summary) {
    return (
      <main className="game-page">
        <div className="game-frame">
          <div className="game-scene game-scene--result">
            <p className="game-problem">Counting the points...</p>
          </div>
        </div>
      </main>
    );
  }

  if (summary && single) {
    const mine = summary.players.find((player) => player.user_id === userId);
    const correct = mine?.correct ?? 0;

    return (
      <main className="game-page">
        <div className="game-frame">
          <div className="game-scene game-scene--result">
            <h1 className="game-result-title">
              <span>CATEGORY:</span>
              <strong>{gradeText}</strong>
              <strong>{categoryText}</strong>
            </h1>

            <div className="game-pedestal" aria-hidden="true">
              <span className="game-pedestal__side" />
              <span className="game-pedestal__top" />
            </div>

            <Avatar
              id={avatarForPlayer(mine, userId, profileAvatarId)}
              className="game-result-avatar"
            />

            <p className="game-score-label">YOUR SCORE IS:</p>

            <div className="game-score-card">
              <span className="game-score-card__star">
                <StarIcon />
              </span>
              <span className="game-score-card__value">
                {correct}/{room.total_rounds}
              </span>
            </div>

            <button
              type="button"
              className="game-exit-button game-exit-button--left"
              onClick={onExit}
            >
              EXIT
            </button>

            <p className="game-result-message">
              {resultMessage(correct, room.total_rounds)}
            </p>

            {summary.pointsAwarded && (
              <div className="game-points-summary" role="status">
                <p>
                  QUESTIONS: {summary.totalQuestions} · CORRECT: {summary.correctAnswers} ·{' '}
                  INCORRECT: {Math.max(0, summary.totalQuestions - summary.correctAnswers)}
                </p>
                <p>
                  +{summary.pointsEarned} PTS EARNED
                  {summary.pointsTotal !== null && ` · TOTAL ${summary.pointsTotal} PTS`}
                </p>
              </div>
            )}

            {rewardError && (
              <p className="game-reward-error" role="alert">
                {rewardError}
              </p>
            )}

            <div className="game-earned-slot game-earned-slot--result">
              <Earned me={mine} summary={summary} showRank={room.mode === 'ranked'} />
            </div>

            <button
              type="button"
              className="game-again-link"
              onClick={onPlayAgain}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (summary) {
    const list = summary.players;
    const mine = list.find((player) => player.user_id === userId);
    const top = list[0];
    const tie = list.length > 1 && list[1].score === top.score;

    return (
      <main className="game-page">
        <div className="game-frame">
          <div className="game-scene game-scene--ranking">
            <h1 className="game-ranking-title">RANKING</h1>

            <p className="game-winner">
              {tie ? 'It is a tie!' : `🏆 ${top.name} wins!`}
            </p>

            <ol className="game-ranking-list">
              {list.map((player) => (
                <li
                  key={player.user_id}
                  className={`game-ranking-row game-ranking-row--${
                    (player.place ?? 9) <= 3 ? 'top' : 'rest'
                  } ${player.user_id === userId ? 'is-me' : ''}`}
                >
                  <span className="game-ranking-row__place">{player.place}</span>
                  <Avatar
                    id={avatarForPlayer(player, userId, profileAvatarId)}
                    className="game-ranking-row__avatar"
                  />
                  <span className="game-ranking-row__name">
                    {player.name}
                    {player.user_id === userId ? ' (you)' : ''}
                  </span>
                  <span className="game-ranking-row__score">{player.score}</span>
                </li>
              ))}
            </ol>

            <div className="game-earned-slot game-earned-slot--ranking">
              <Earned
                me={mine}
                summary={summary}
                showRank={room.mode === 'ranked'}
              />
            </div>

            <div className="game-ranking-buttons">
              <button type="button" className="game-ranking-button" onClick={onExit}>
                BACK TO LOBBY
              </button>
              <button
                type="button"
                className="game-ranking-button game-ranking-button--orange"
                onClick={onPlayAgain}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- PLAYING ---------- */

  const feet = project(pos.u, pos.v);
  const size = 100 * (1 - 0.38 * pos.v);
  const outcome = outcomes[index];
  const revealing = phase === 'reveal' || confirmedRounds[index];
  const countdown = Math.max(
    0,
    Math.ceil((new Date(room.started_at).getTime() - now) / 1000)
  );

  const showQuestion = question && phase !== 'countdown';
  const questionText = showQuestion ? question.question : '';
  const redText = showQuestion ? String(question.red_answer) : '';
  const blueText = showQuestion ? String(question.blue_answer) : '';
  const questionSize = questionText.length > 11 ? 32 : 40;
  const answerSize = Math.max(redText.length, blueText.length) >= 4 ? 32 : 40;

  const secondsLeft =
    phase === 'playing'
      ? Math.max(0, Math.ceil((roundMs - within) / 1000))
      : phase === 'reveal'
        ? 0
        : room.round_seconds;
  const timerText = `${secondsLeft} ${secondsLeft === 1 ? 'sec' : 'secs'}`;
  const correctSoFar = Object.values(outcomes).filter((item) => item === 'correct').length;

  // Top 3 (and you) shown after every round in multiplayer games.
  const standings = [...players].sort((a, b) => b.score - a.score);
  const myRank = standings.findIndex((player) => player.user_id === userId) + 1;
  const topThree = standings.slice(0, 3);

  let announcement = '';
  if (revealing && outcome) {
    announcement = outcome === 'correct' ? 'Correct!' : 'Not this time.';
  }

  return (
    <main className="game-page">
      <div className="game-frame">
        <div className="game-scene">
          {/* THE WORLD */}
          <svg
            ref={svgRef}
            className="game-world"
            viewBox={`${cam.x} ${cam.y} ${DESIGN_W / cam.zoom} ${DESIGN_H / cam.zoom}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onPointerLeave={stopDragging}
          >
            <defs>
              <pattern
                id="game-checker"
                x="-52"
                y="97"
                width="256"
                height="256"
                patternUnits="userSpaceOnUse"
              >
                <rect width="256" height="256" fill="#ff8a4a" />
                <rect x="128" width="128" height="128" fill="#ffbb59" />
                <rect y="128" width="128" height="128" fill="#ffbb59" />
              </pattern>
            </defs>
            <rect
              x="-400"
              y="-400"
              width="1212"
              height="1717"
              fill="url(#game-checker)"
            />

            <polygon className="game-board" points="95,182 322,182 314,323 103,323" />
            <text
              className="game-board-text"
              x="208"
              y="253"
              style={{ fontSize: questionSize }}
            >
              {questionText}
            </text>

            <polygon className="game-board" points="81,354 190,354 188,435 84,435" />
            <text
              className="game-board-text"
              x="135"
              y="395"
              style={{ fontSize: answerSize }}
            >
              {redText}
            </text>

            <polygon className="game-board" points="223,354 332,354 328,435 226,435" />
            <text
              className="game-board-text"
              x="277"
              y="395"
              style={{ fontSize: answerSize }}
            >
              {blueText}
            </text>

            <polygon className="game-platform" points="75,478 340,478 432,697 -31,697" />
            <polygon className="game-platform-edge" points="-31,697 432,697 432,716 -31,716" />

            <polygon className="game-tile game-tile--red" points={zonePoints(ZONES.red)} />
            <polygon className="game-tile game-tile--blue" points={zonePoints(ZONES.blue)} />

            <ellipse
              className="game-avatar-shadow"
              cx={feet.x}
              cy={feet.y}
              rx={size * 0.27}
              ry={size * 0.06}
            />
            <g className={`game-avatar ${moving ? 'is-walking' : ''}`}>
              <SvgAvatar
                id={avatarForPlayer(me, userId, profileAvatarId)}
                x={feet.x}
                y={feet.y}
                size={size}
                facing={facing}
                lean={moving ? (facing === 'right' ? 4 : -4) : 0}
              />
            </g>
          </svg>

          {/* TOP BAR */}
          <div className="game-counter">
            {correctSoFar}/{room.total_rounds}
          </div>

          <button
            type="button"
            className="game-quit"
            onClick={onExit}
            aria-label="Quit game"
          >
            ✕
          </button>

          {/* the question and answers, always in view while the camera is close */}
          {phase === 'playing' && cam.zoom > 1.15 && question && (
            <div className="game-hud">
              <p className="game-hud__question">{questionText}</p>
              <div className="game-hud__answers">
                <span className="game-hud__chip game-hud__chip--red">{redText}</span>
                <span className="game-hud__chip game-hud__chip--blue">{blueText}</span>
              </div>
            </div>
          )}

          {/* GET READY */}
          {phase === 'countdown' && (
            <div className="game-countdown">
              <p>
                {gradeText} · {categoryText}
              </p>
              <strong>{countdown}</strong>
              <span>Get ready!</span>
            </div>
          )}

          {phase === 'playing' && !single && (
            <p
              className={`game-confirmation-status ${
                cam.zoom > 1.15 ? 'game-confirmation-status--below-hud' : ''
              }`}
              role="status"
            >
              {confirmationStatusError?.round === index
                ? confirmationStatusError.message
                : confirmationStatus?.round !== index
                  ? 'Checking player confirmations...'
                  : `${confirmationStatus.confirmed_players} of ${confirmationStatus.total_players} confirmed · ${
                      Math.max(
                        0,
                        confirmationStatus.total_players
                          - confirmationStatus.confirmed_players
                      )
                    } confirmations pending`}
            </p>
          )}

          {/* RIGHT OR WRONG */}
          {answerFeedback && (
            <div className={`game-overlay game-overlay--${answerFeedback}`}>
              <div className="game-overlay__icon">
                {answerFeedback === 'correct' ? <CheckIcon /> : <CrossIcon />}
              </div>
            </div>
          )}

          {revealing && outcome && !single && (
            <div className="game-standings">
              <p className="game-standings__title">
                Round {index + 1} of {room.total_rounds}
              </p>
              {topThree.map((player, position) => (
                <p
                  key={player.user_id}
                  className={`game-standings__row ${
                    player.user_id === userId ? 'is-me' : ''
                  }`}
                >
                  <span>{position + 1}</span>
                  <span>{player.name}</span>
                  <strong>{player.score}</strong>
                </p>
              ))}
              {myRank > 3 && me && (
                <p className="game-standings__row is-me">
                  <span>{myRank}</span>
                  <span>You</span>
                  <strong>{me.score}</strong>
                </p>
              )}
            </div>
          )}

          {/* TIMER */}
          <div
            className={`game-timer ${revealing && outcome ? `is-${outcome}` : ''}`}
            role="timer"
          >
            {timerText}
          </div>

          {phase === 'playing' && !confirmedRounds[index] && (
            <button
              type="button"
              className="game-confirm"
              onClick={confirmAnswer}
              disabled={confirmingRounds[index]}
            >
              {confirmingRounds[index] ? 'CHECKING...' : 'CONFIRM ANSWER'}
            </button>
          )}

          {answerErrors[index] && (
            <>
              <p className="game-answer-error" role="alert">
                {answerErrors[index]}
              </p>
              {phase === 'reveal' && (
                <button
                  type="button"
                  className="game-confirm"
                  disabled={confirmingRounds[index]}
                  onClick={() => {
                    if (submittedRef.current.has(index)) return;
                    submittedRef.current.add(index);
                    submitAutomaticAnswer(
                      index,
                      zoneAt(posRef.current.u, posRef.current.v) || 'none'
                    );
                  }}
                >
                  {confirmingRounds[index] ? 'RETRYING...' : 'RETRY ANSWER'}
                </button>
              )}
            </>
          )}

          <p className="game-hint">
            {phase === 'playing' && confirmedRounds[index]
              ? single
                ? 'Answer confirmed. Moving to the next question...'
                : 'Answer confirmed. Waiting for all players...'
              : phase === 'playing'
                ? `Round ${index + 1} of ${room.total_rounds}. ${
                    touch
                      ? 'Tap or drag to walk'
                      : 'Click, drag, or use the arrow keys to walk'
                  } to the red or blue answer.`
                : phase === 'reveal'
                  ? myRank > 0 && !single
                    ? `You are ${ordinal(myRank)} right now`
                    : ' '
                  : ' '}
          </p>

          <p className="game-sr" role="status">
            {announcement}
          </p>
        </div>
      </div>
    </main>
  );
}