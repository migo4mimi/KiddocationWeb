import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  createCustomRoom,
  extendLobby,
  fetchRoom,
  findRankedRoom,
  joinRoomByCode,
  leaveRoom,
  roomHeartbeat,
  serverNow,
  startRankedSolo,
  startRoom,
  subscribeToRoom,
  syncClock,
} from '../lib/rooms';
import { categoryLabel } from '../lib/progress';
import { avatarForPlayer } from '../lib/playerAvatar';
import { notify } from '../lib/feedback';
import Setup from './Setup';
import Avatar from './Avatar';
import './lobby.css';

const CODE_PATTERN = /^\d{6}$/;

export default function Lobby({
  mode,
  settings,
  profileGrade = 1,
  profileAvatarId,
  isAdmin = false,
  initialCode = '',
  initialView,
  onTutorialRequest,
  onExit,
  onGameStart,
}) {
  const isRanked = mode === 'ranked';
  const grade = settings?.grade ?? profileGrade;

  // searching | menu | join | waiting | problem
  const [view, setView] = useState(
    isRanked ? 'searching' : initialView || (settings ? 'setup' : 'menu')
  );
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [codeInput, setCodeInput] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [now, setNow] = useState(() => serverNow());

  const roomIdRef = useRef(null);
  const keepRoomRef = useRef(false);
  const bootedRef = useRef(false);
  const lastAutoRef = useRef(0);
  const launchedRef = useRef(false);

  function enterRoom(id) {
    roomIdRef.current = id;
    setRoomId(id);
    setView('waiting');
    setError('');

    // Remove ?join=123456 from the address bar once we are in.
    if (window.location.search.includes('join=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  function showProblem(message) {
    roomIdRef.current = null;
    setRoomId(null);
    setRoom(null);
    setPlayers([]);
    setError(message);
    setView(isRanked ? 'problem' : 'menu');
  }

  // Start: find a Ranked match, or open the invite link's room.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    async function boot() {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
      await syncClock();

      try {
        if (isRanked) {
          enterRoom(await findRankedRoom(settings.grade, settings.category));
        } else if (CODE_PATTERN.test(initialCode)) {
          enterRoom(await joinRoomByCode(initialCode));
        }
      } catch (err) {
        showProblem(err.message);
      }
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A clock that ticks four times a second, matched to the server.
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 250);
    return () => clearInterval(timer);
  }, []);

  // While in a room: live updates, a backup refresh, and a heartbeat.
  useEffect(() => {
    if (!roomId) return undefined;

    let alive = true;

    async function refresh() {
      try {
        const data = await fetchRoom(roomId);
        if (!alive) return;

        if (!data.room || data.room.status === 'closed') {
          showProblem('You are no longer in this room.');
          return;
        }

        setRoom(data.room);
        setPlayers(data.players);
      } catch (err) {
        // A short connection problem: the next refresh will try again.
      }
    }

    refresh();
    roomHeartbeat(roomId).catch(() => {});

    const poll = setInterval(refresh, 3000);
    const beat = setInterval(() => roomHeartbeat(roomId).catch(() => {}), 5000);

    const stopListening = subscribeToRoom(roomId, {
      onRoom: (payload) => {
        if (payload.new && payload.new.id) setRoom(payload.new);
      },
      onPlayer: (payload) => {
        setPlayers((previous) => {
          if (payload.eventType === 'DELETE') {
            return previous.filter((p) => p.user_id !== payload.old.user_id);
          }

          const others = previous.filter((p) => p.user_id !== payload.new.user_id);
          return [...others, payload.new].sort(
            (a, b) => new Date(a.joined_at) - new Date(b.joined_at)
          );
        });
      },
    });

    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(beat);
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Ranked: when the countdown ends, start (or wait longer if you are alone).
  useEffect(() => {
    if (!room || room.mode !== 'ranked' || room.status !== 'waiting') return;
    if (!room.lobby_ends_at) return;

    const ends = new Date(room.lobby_ends_at).getTime();
    const full = players.length >= room.max_players;

    if (now < ends && !full) return;
    if (Date.now() - lastAutoRef.current < 2500) return;
    lastAutoRef.current = Date.now();

    // With 2 or more players the match starts for everyone. Alone, you choose
    // below: a solo ranked run, or keep waiting.
    if (players.length >= 2) {
      startRoom(roomId).catch(() => {});
    }
  }, [now, room, players, roomId]);

  // The host pressed START (or the Ranked countdown ended): everyone goes to the game.
  useEffect(() => {
    if (room?.status === 'playing' && roomId && !launchedRef.current) {
      launchedRef.current = true;
      keepRoomRef.current = true;
      notify('Kiddocation', 'Your game is starting!');
      onGameStart(roomId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, roomId]);

  // Leaving the page by any route: step out of the room.
  useEffect(
    () => () => {
      if (roomIdRef.current && !keepRoomRef.current) {
        leaveRoom(roomIdRef.current).catch(() => {});
      }
    },
    []
  );

  /* ---------- actions ---------- */

  async function handleCreate(choice) {
    if (onTutorialRequest?.(choice.category, choice)) return;

    setBusy(true);
    setError('');

    try {
      const created = await createCustomRoom(
        choice.grade,
        choice.category,
        choice.rounds
      );
      enterRoom(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();

    const code = codeInput.trim();

    if (!CODE_PATTERN.test(code)) {
      setError('Type the 6 digit code from your friend.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      enterRoom(await joinRoomByCode(code));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    setBusy(true);
    setError('');

    try {
      await startRoom(roomId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSolo() {
    setBusy(true);
    setError('');

    try {
      await startRankedSolo(roomId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleKeepWaiting() {
    setError('');

    try {
      await extendLobby(roomId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLeave() {
    keepRoomRef.current = false;

    if (roomIdRef.current) {
      try {
        await leaveRoom(roomIdRef.current);
      } catch (err) {
        // Leaving is best effort.
      }
      roomIdRef.current = null;
    }

    onExit();
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1600);
    } catch (err) {
      setError('Copying is not available here. Select the code and copy it by hand.');
    }
  }

  /* ---------- what to show ---------- */

  const title = isRanked ? 'RANKED MATCH' : 'CUSTOM GAME';
  const subtitle = room
    ? `Grade ${room.grade} · ${categoryLabel(room.category)}${
        room.mode === 'custom' ? ` · ${room.total_rounds} rounds` : ''
      }`
    : settings
      ? `Grade ${settings.grade} · ${categoryLabel(settings.category)}`
      : 'Play with friends';
  const isHost = !isRanked && room?.host_id === userId;
  const inviteLink = room?.code
    ? `${window.location.origin}${import.meta.env.BASE_URL}?join=${room.code}`
    : '';

  const lobbySeconds = room?.lobby_ends_at
    ? Math.max(0, Math.ceil((new Date(room.lobby_ends_at).getTime() - now) / 1000))
    : 0;

  const playing = room?.status === 'playing' || room?.status === 'finished';

  if (view === 'setup') {
    return (
      <Setup
        mode="custom"
        maxGrade={profileGrade}
        isAdmin={isAdmin}
        busy={busy}
        error={error}
        initial={settings}
        onConfirm={handleCreate}
        onViewTutorial={(choice) =>
          onTutorialRequest?.(choice.category, choice, true)
        }
        onBack={() => {
          setError('');
          setView('menu');
        }}
      />
    );
  }

  return (
    <main className="lobby-page">
      <div className="lobby-column">
        <header className="lobby-header">
          <button
            type="button"
            className="lobby-back"
            onClick={handleLeave}
            aria-label="Leave and go back"
          >
            ←
          </button>

          <div>
            <h1 className="lobby-title">{title}</h1>
            <p className="lobby-subtitle">{subtitle}</p>
          </div>
        </header>

        {error && (
          <p className="lobby-error" role="alert">
            {error}
          </p>
        )}

        {/* RANKED: looking for a match */}
        {view === 'searching' && (
          <div className="lobby-card">
            <h2 className="lobby-card__header">Finding players</h2>
            <p className="lobby-note">
              Looking for other Grade {grade} students playing{' '}
              {categoryLabel(settings?.category)}...
            </p>
          </div>
        )}

        {view === 'problem' && (
          <div className="lobby-card">
            <h2 className="lobby-card__header">Something went wrong</h2>
            <div className="lobby-actions">
              <button
                type="button"
                className="lobby-button"
                onClick={() => window.location.reload()}
              >
                TRY AGAIN
              </button>
              <button
                type="button"
                className="lobby-button lobby-button--light"
                onClick={handleLeave}
              >
                BACK
              </button>
            </div>
          </div>
        )}

        {/* CUSTOM: create or join */}
        {view === 'menu' && (
          <div className="lobby-card">
            <h2 className="lobby-card__header">Play with friends</h2>
            <p className="lobby-note">
              Make a room and share its code, or type a code from a friend.
            </p>

            <div className="lobby-actions">
              <button
                type="button"
                className="lobby-button"
                onClick={() => {
                  setError('');
                  setView('setup');
                }}
                disabled={busy}
              >
                CREATE ROOM
              </button>
              <button
                type="button"
                className="lobby-button lobby-button--light"
                onClick={() => {
                  setError('');
                  setView('join');
                }}
              >
                JOIN WITH CODE
              </button>
            </div>
          </div>
        )}

        {view === 'join' && (
          <form className="lobby-card" onSubmit={handleJoin}>
            <h2 className="lobby-card__header">Enter the code</h2>

            <input
              className="lobby-code-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="000000"
              value={codeInput}
              onChange={(event) =>
                setCodeInput(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              aria-label="Room code"
              autoFocus
            />

            <div className="lobby-actions">
              <button type="submit" className="lobby-button" disabled={busy}>
                JOIN
              </button>
              <button
                type="button"
                className="lobby-button lobby-button--light"
                onClick={() => {
                  setError('');
                  setView('menu');
                }}
              >
                BACK
              </button>
            </div>
          </form>
        )}

        {/* THE WAITING ROOM */}
        {view === 'waiting' && room && (
          <>
            {!isRanked && room.code && (
              <div className="lobby-code-card">
                <span className="lobby-code-card__label">ROOM CODE</span>
                <strong className="lobby-code-card__code">{room.code}</strong>

                <div className="lobby-code-card__buttons">
                  <button
                    type="button"
                    className="lobby-chip"
                    onClick={() => copyText(room.code, 'code')}
                  >
                    {copied === 'code' ? 'Copied!' : 'Copy code'}
                  </button>
                  <button
                    type="button"
                    className="lobby-chip"
                    onClick={() => copyText(inviteLink, 'link')}
                  >
                    {copied === 'link' ? 'Copied!' : 'Copy invite link'}
                  </button>
                </div>
              </div>
            )}

            <div className="lobby-status" role="status">
              {playing && 'Starting the game...'}
              {!playing &&
                isRanked &&
                (players.length >= 2
                  ? `Match starts in ${lobbySeconds} sec`
                  : lobbySeconds > 0
                    ? `Waiting for players... ${lobbySeconds}`
                    : 'No one else is online yet')}
              {!playing &&
                !isRanked &&
                (isHost
                  ? players.length >= 2
                    ? 'Everyone is here? Press START.'
                    : 'Waiting for a friend to join...'
                  : 'Waiting for the host to start...')}
            </div>

            <div className="lobby-card">
              <h2 className="lobby-card__header">
                Players {players.length}/{room.max_players}
              </h2>

              <ul className="lobby-players">
                {players.map((player) => (
                  <li key={player.user_id} className="lobby-player">
                    <Avatar
                      id={avatarForPlayer(player, userId, profileAvatarId)}
                      className="lobby-player__avatar"
                    />
                    <span className="lobby-player__name">{player.name}</span>

                    {room.host_id === player.user_id && !isRanked && (
                      <span className="lobby-badge">HOST</span>
                    )}
                    {player.user_id === userId && (
                      <span className="lobby-badge lobby-badge--you">YOU</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lobby-actions">
              {isHost && !playing && (
                <button
                  type="button"
                  className="lobby-button"
                  onClick={handleStart}
                  disabled={busy || players.length < 2}
                >
                  START
                </button>
              )}

              {isRanked && !playing && players.length < 2 && lobbySeconds === 0 && (
                <>
                  <p className="lobby-note lobby-note--card">
                    No one else is online right now. Play a solo ranked run to
                    earn rank points by yourself, or keep waiting for a match.
                  </p>

                  <button
                    type="button"
                    className="lobby-button"
                    onClick={handleSolo}
                    disabled={busy}
                  >
                    PLAY SOLO RANKED
                  </button>

                  <button
                    type="button"
                    className="lobby-button lobby-button--light"
                    onClick={handleKeepWaiting}
                  >
                    KEEP WAITING
                  </button>
                </>
              )}

              <button
                type="button"
                className="lobby-button lobby-button--light"
                onClick={handleLeave}
              >
                {playing ? 'EXIT' : 'LEAVE'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}