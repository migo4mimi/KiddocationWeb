import { useState } from 'react';
import { createPracticeRoom } from '../lib/rooms';
import { categoryLabel, levelInfo, rankForLevel } from '../lib/progress';
import { isStaff } from '../lib/staff';
import Avatar from './Avatar';
import ProfilePicture from './ProfilePicture';
import AvatarStore from './AvatarStore';
import Settings from './Settings';
import Setup from './Setup';
import Game from './Game';
import Friends from './Friends';
import Lobby from './lobby';
import Leaderboard from './LeaderBoard';
import LearningPacket from './LearningPacket';
import ModeSelector from './Modeselector';
import Tutorial from './Tutorial';
import star1 from '../assets/nav/star-1.svg';
import star2 from '../assets/nav/star-2.svg';
import gear1 from '../assets/nav/gear-1.png';
import gear2 from '../assets/nav/gear-2.png';
import './Home.css';
import './Homescreen.css';

// The three game modes in the selector. The one in the middle is played
// with the round Play button (like the Figma Home screen).
const MODES = [
  {
    id: 'ranked',
    label: 'RANKED',
    description: 'Compete with other learners and earn points.',
  },
  {
    id: 'practice',
    label: 'PRACTICE',
    description: 'Learn and improve at your own pace.',
  },
  {
    id: 'custom',
    label: 'CUSTOM',
    description: 'Make a room and invite a friend with a code.',
  },
];

export default function Home({
  profile,
  onLogout,
  onRefreshProfile,
  onDashboard,
}) {
  const [activeTab, setActiveTab] = useState('avatar');
  const [showStore, setShowStore] = useState(false);
  const [mode, setMode] = useState(0);

  // What is on screen instead of the Home page:
  //   { type: 'setup', mode }                    choose grade and category
  //   { type: 'packet', mode, settings }         read before the game
  //   { type: 'lobby', mode, settings, code }    waiting room
  //   { type: 'game', roomId, mode, settings }   the live game
  const [flow, setFlow] = useState(() => {
    // An invite link looks like  https://your-site/?join=123456
    const code = new URLSearchParams(window.location.search).get('join');
    const next = code && /^\d{6}$/.test(code)
      ? { type: 'lobby', mode: 'custom', code }
      : null;
    return next;
  });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const displayName = profile?.name || 'Player';
  const grade = Number(profile?.grade) || 1;
  const staff = isStaff(profile?.role);
  const isAdmin = staff;
  const usesTouch = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  // Everyone starts at Level 1 with 0 XP.
  const info = levelInfo(profile?.xp || 0);
  const rank = rankForLevel(info.level);
  const points = profile?.points || 0;

  const current = MODES[mode];

  // Ranked shows the round Play button. Practice and Custom show one wide tile.
  const wide = current.id !== 'ranked';

  function requestCategoryTutorial(category, settings, force = false) {
    if (!force) return false;

    setFlow({
      type: 'tutorial',
      category,
      next: {
        type: 'lobby',
        mode: 'custom',
        settings,
        initialView: 'setup',
      },
    });
    return true;
  }

  function leaveFlow() {
    setProblem('');
    setFlow(null);
    onRefreshProfile?.();
  }

  async function startPractice(settings) {
    setBusy(true);
    setProblem('');

    try {
      const roomId = await createPracticeRoom(
        settings.grade,
        settings.category,
        settings.rounds,
        settings.roundSeconds
      );
      setFlow({ type: 'game', roomId, mode: 'practice', settings });
      return {};
    } catch (err) {
      setProblem(err.message);
      return { error: err.message };
    } finally {
      setBusy(false);
    }
  }

  function handleSetupConfirm(settings) {
    if (flow.mode === 'practice') {
      startPractice(settings);
      return;
    }

    setFlow({ type: 'lobby', mode: flow.mode, settings });
  }

  function handleViewTutorial(settings) {
    setFlow({
      type: 'tutorial',
      category: settings.category,
      next: { type: 'setup', mode: flow.mode, initial: settings },
    });
  }

  function handleViewPacket(settings) {
    setFlow({
      type: 'packet',
      mode: flow.mode,
      settings,
    });
  }

  function handlePlayAgain() {
    const { mode: playedMode, settings } = flow;

    onRefreshProfile?.();

    if (playedMode === 'practice') {
      startPractice(settings);
    } else if (playedMode === 'ranked') {
      setFlow({ type: 'lobby', mode: 'ranked', settings });
    } else {
      setFlow({ type: 'lobby', mode: 'custom' });
    }
  }

  // The Play button starts the mode in the middle.
  function play() {
    if (current.id === 'custom') {
      setFlow({ type: 'lobby', mode: 'custom' });
    } else {
      setFlow({ type: 'setup', mode: current.id });
    }
  }

  if (flow?.type === 'tutorial') {
    return (
      <Tutorial
        avatarId={profile?.avatar_id}
        userId={profile?.id}
        category={flow.category}
        categoryName={categoryLabel(flow.category)}
        onDone={() => setFlow(flow.next)}
      />
    );
  }

  if (flow?.type === 'packet') {
    const { settings } = flow;
    const isReview = flow.mode === 'review';

    return (
      <LearningPacket
        grade={settings.grade}
        category={settings.category}
        onBack={() => {
          if (isReview) setFlow(null);
          else setFlow({ type: 'setup', mode: flow.mode, initial: settings });
        }}
        onPlay={() => {
          if (isReview) {
            setFlow(null);
            return;
          }

          if (flow.mode === 'practice') return startPractice(settings);
          setFlow({ type: 'lobby', mode: flow.mode, settings });
        }}
        playLabel={isReview ? 'BACK TO GAME MODES' : 'PLAY'}
      />
    );
  }

  // The setup, lobby and game take over the whole screen.
  if (flow?.type === 'setup') {
    return (
      <Setup
        mode={flow.mode}
        maxGrade={grade}
        isAdmin={isAdmin}
        busy={busy}
        error={problem}
        initial={flow.initial}
        onConfirm={handleSetupConfirm}
        onViewPacket={handleViewPacket}
        onViewTutorial={handleViewTutorial}
        onBack={leaveFlow}
      />
    );
  }

  if (flow?.type === 'lobby') {
    return (
      <Lobby
        key={`${flow.mode}-${flow.code || ''}-${flow.settings?.category || ''}`}
        mode={flow.mode}
        settings={flow.settings}
        profileGrade={grade}
        profileAvatarId={profile?.avatar_id}
        isAdmin={isAdmin}
        initialCode={flow.code || ''}
        initialView={flow.initialView}
        onTutorialRequest={requestCategoryTutorial}
        onExit={leaveFlow}
        onGameStart={(roomId) =>
          setFlow({
            type: 'game',
            roomId,
            mode: flow.mode,
            settings: flow.settings,
          })
        }
      />
    );
  }

  if (flow?.type === 'game') {
    return (
      <Game
        key={flow.roomId}
        roomId={flow.roomId}
        profileAvatarId={profile?.avatar_id}
        onExit={leaveFlow}
        onPlayAgain={handlePlayAgain}
        onRefreshProfile={onRefreshProfile}
      />
    );
  }

  const onHomeView = activeTab === 'avatar' && !showStore;

  return (
    <main className="hm-page">
      <div className="hm-stage">
        <div className="hm-inner">
          {/* HEADER (hidden on Settings, which has its own profile card) */}
          {activeTab !== 'settings' && (
            <header className="hm-header">
              {staff && onDashboard && (
                <button
                  type="button"
                  className="hm-back"
                  onClick={onDashboard}
                  aria-label="Back to the dashboard"
                >
                  ←
                </button>
              )}

              <div className="hm-pill">
                <span className="hm-pill__name">{displayName}</span>
                <span className="hm-pill__level">Level {info.level}</span>
              </div>

              <button
                type="button"
                className="hm-initial"
                onClick={() => setActiveTab('settings')}
                aria-label={`Open settings for ${displayName}`}
              >
                <ProfilePicture
                  path={profile?.profile_picture_path}
                  offsetX={profile?.profile_picture_offset_x}
                  offsetY={profile?.profile_picture_offset_y}
                  zoom={profile?.profile_picture_zoom}
                  avatarId={profile?.avatar_id}
                  className="hm-initial__picture"
                />
              </button>

              <div
                className="hm-xp"
                role="progressbar"
                aria-label="Experience"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={info.percent}
              >
                <span style={{ width: `${info.percent}%` }} />
              </div>

              <span className="hm-points">{points} PTS</span>
            </header>
          )}

          {/* MAIN CONTENT (changes with the bottom tabs) */}
          {activeTab === 'settings' ? (
            <Settings
              profile={profile}
              onBack={() => setActiveTab('avatar')}
              onLogout={onLogout}
              onRefreshProfile={onRefreshProfile}
            />
          ) : activeTab === 'friends' ? (
            <Friends
              profile={profile}
              onBack={() => setActiveTab('avatar')}
            />
          ) : activeTab === 'ranks' ? (
            <Leaderboard />
          ) : showStore ? (
            <AvatarStore profile={profile} onRefreshProfile={onRefreshProfile} />
          ) : (
            <section className="hm-main">
              {/* your avatar: tap it to open the avatar store */}
              <button
                type="button"
                className="hm-avatar"
                onClick={() => setShowStore(true)}
                aria-label="Open the avatar store"
              >
                <Avatar id={profile?.avatar_id} />
              </button>

              {/* the mode selector (the same as your Figma Home screens) */}
              <ModeSelector
                modes={MODES}
                index={mode}
                onChange={setMode}
                onPlay={play}
                rank={rank}
              />

              <p className="hm-description">{current.description}</p>
              <p className="hm-hint">
                {wide
                  ? `${usesTouch ? 'Tap' : 'Click'} ${current.label} to start`
                  : `${usesTouch ? 'Tap' : 'Click'} Play to start`}
              </p>
<button
  type="button"
  className="hm-learning-button"
  onClick={() => setActiveTab('learning')}
>
  📚 LEARNING POCKET
</button>

<button
  type="button"
  className="hm-friends-button"
  onClick={() => setActiveTab('friends')}
>
  FRIENDS &amp; CHAT
</button>
            </section>
          )}

          {/* BOTTOM BAR */}
          <nav className="hm-nav" aria-label="Main navigation">
            <button
              type="button"
              className={`hm-nav__item ${onHomeView || (activeTab === 'avatar' && showStore) ? 'is-active' : ''}`}
              onClick={() => {
                if (activeTab === 'avatar' && !showStore) {
                  setShowStore(true);
                } else {
                  setActiveTab('avatar');
                  setShowStore(false);
                }
              }}
            >
              <span className="hm-nav__icon hm-nav__icon--avatar">
                <Avatar id={profile?.avatar_id} />
              </span>
              <span className="hm-nav__label">AVATAR</span>
            </button>

            <button
              type="button"
              className={`hm-nav__item ${activeTab === 'ranks' ? 'is-active' : ''}`}
              onClick={() => {
                if (activeTab === 'ranks') {
                  setActiveTab('avatar');
                  setShowStore(false);
                } else {
                  setActiveTab('ranks');
                }
              }}
            >
              <span className="hm-nav__icon hm-nav__icon--star">
                <span
                  className="hm-layer"
                  style={{ inset: '6.25% 5.52% 4.51% 5.52%' }}
                >
                  <img src={star1} alt="" />
                </span>
                <span
                  className="hm-box"
                  style={{ left: '8.37%', top: '8.8%', width: '82.3%', height: '82.7%' }}
                >
                  <span
                    className="hm-layer"
                    style={{ inset: '7.51% -6.15% -12.5% 2.37%' }}
                  >
                    <img src={star2} alt="" />
                  </span>
                </span>
              </span>
              <span className="hm-nav__label">RANKS</span>
            </button>

            <button
              type="button"
              className={`hm-nav__item ${activeTab === 'settings' ? 'is-active' : ''}`}
              onClick={() => {
                if (activeTab === 'settings') {
                  setActiveTab('avatar');
                  setShowStore(false);
                } else {
                  setActiveTab('settings');
                }
              }}
            >
              <span className="hm-nav__icon hm-nav__icon--gear">
                <img className="hm-gear hm-gear--back" src={gear1} alt="" />
                <img className="hm-gear hm-gear--front" src={gear2} alt="" />
              </span>
              <span className="hm-nav__label">SETTINGS</span>
            </button>
          </nav>
        </div>
      </div>
    </main>
  );
}