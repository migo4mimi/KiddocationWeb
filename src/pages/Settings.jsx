import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ProfilePicture from './ProfilePicture';
import { levelInfo, rankForLevel } from '../lib/progress';
import { isStaff } from '../lib/staff';
import { applyTheme, getPrefs, setPref } from '../lib/prefs';
import {
  askNotificationPermission,
  playSfx,
  sendTestNotification,
  syncMusic,
  vibrate,
} from '../lib/feedback';
import './SettingsPage.css';

import backArrow from '../assets/settings/back-arrow.svg';
import avatarCircle from '../assets/settings/avatar-circle.svg';
import fireIcon from '../assets/settings/fire.png';
import RankEmblem from './RankEmblem';
import profileIcon from '../assets/settings/icon-profile.png';
import lockIcon from '../assets/settings/icon-lock.svg';
import deleteIcon from '../assets/settings/icon-delete.png';
import soundIcon from '../assets/settings/icon-sound.png';
import musicIcon from '../assets/settings/icon-music.svg';
import bellIcon from '../assets/settings/icon-bell.svg';
import moonIcon from '../assets/settings/icon-moon.svg';

const ERRORS = {
  bad_name: 'Use a name with 2 to 30 letters.',
  bad_grade: 'Choose a grade from 1 to 6.',
  last_admin: 'You are the only admin. Make someone else an admin first.',
  no_profile: 'Your profile could not be found.',
};
const PROFILE_PICTURE_BUCKET = 'profile-pictures';
const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_PICTURE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
function friendly(error) {
  const text = error?.message || '';
  const key = Object.keys(ERRORS).find((name) => text.includes(name));
  return key ? ERRORS[key] : text || 'Something went wrong.';
}

/* ---------- small building blocks ---------- */

function Chevron() {
  return <span className="settings-chevron" aria-hidden="true" />;
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-toggle__knob" />
    </button>
  );
}

function Section({ title, variant, children }) {
  return (
    <section className={`settings-section settings-section--${variant}`}>
      <h3 className="settings-section__header">{title}</h3>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

function LinkRow({ icon, title, description, onClick }) {
  return (
    <button
      type="button"
      className="settings-row settings-row--detail"
      onClick={onClick}
    >
      <span className="settings-row__icon">{icon}</span>
      <span className="settings-row__text">
        <span className="settings-row__title">{title}</span>
        <span className="settings-row__desc">{description}</span>
      </span>
      <Chevron />
    </button>
  );
}

function ToggleRow({ icon, title, checked, onChange, compact }) {
  return (
    <div
      className={`settings-row settings-row--simple ${
        compact ? 'settings-row--compact' : ''
      }`}
    >
      <span className="settings-row__icon">{icon}</span>
      <span className="settings-row__title">{title}</span>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

// Small pop-up window used by Profile, Password, Email, Delete and Alerts.
function Modal({ title, onClose, children }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="settings-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label={title}>
        <button
          type="button"
          className="settings-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="settings-modal__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// The email and vibration icons in Figma are built from plain shapes
// (no exportable image), so they are drawn here as small SVGs.
function EmailIcon() {
  return (
    <svg width="31" height="22" viewBox="0 0 31 22" aria-hidden="true">
      <rect width="31" height="22" rx="3" fill="#ff8a00" />
      <path
        d="M3.5 5 L15.5 13.5 L27.5 5"
        fill="none"
        stroke="#b4d77b"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VibrationIcon() {
  return (
    <svg width="29" height="23" viewBox="0 0 29 23" aria-hidden="true">
      <rect x="8.5" y="0.5" width="12" height="22" rx="3" fill="#ffbd59" stroke="#ff8a00" />
      <rect x="9" y="14" width="11" height="8" rx="2" fill="#ff8a00" />
      <path
        d="M5.5 4 L2.5 6.7 L5.5 9.4 L2.5 12.1 L5.5 14.8 L2.5 17.5"
        fill="none"
        stroke="#ffbd59"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.5 4 L26.5 6.7 L23.5 9.4 L26.5 12.1 L23.5 14.8 L26.5 17.5"
        fill="none"
        stroke="#ffbd59"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="32" height="26" viewBox="0 0 32 26" aria-hidden="true">
      <rect x="1" y="5" width="30" height="20" rx="4" fill="#ffbd59" stroke="#ff8a00" strokeWidth="1.5" />
      <rect x="9" y="1" width="9" height="6" rx="2" fill="#ff8a00" />
      <circle cx="16" cy="15" r="6" fill="#ffffff" stroke="#ff8a00" strokeWidth="1.5" />
      <circle cx="16" cy="15" r="2.5" fill="#ff8a00" />
    </svg>
  );
}

/* ---------- the pop-up forms ---------- */

function ProfileForm({ profile, onDone, onRefreshProfile }) {
  const staff = isStaff(profile?.role);
  const [name, setName] = useState(profile?.name || '');
  const [grade, setGrade] = useState(String(profile?.grade || 1));
  const picturePath = profile?.profile_picture_path || '';
  const [pictureOffsetX, setPictureOffsetX] = useState(
    Number(profile?.profile_picture_offset_x) || 0
  );
  const [pictureOffsetY, setPictureOffsetY] = useState(
    Number(profile?.profile_picture_offset_y) || 0
  );
  const [pictureZoom, setPictureZoom] = useState(
    Number(profile?.profile_picture_zoom) || 100
  );
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      if (picturePreviewUrl) URL.revokeObjectURL(picturePreviewUrl);
    },
    [picturePreviewUrl]
  );

  async function changePicture(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!PROFILE_PICTURE_TYPES[file.type]) {
      setError('Choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > PROFILE_PICTURE_MAX_BYTES) {
      setError('Your photo must be 5 MB or smaller.');
      return;
    }

    setError('');
    setPictureFile(file);
    setPicturePreviewUrl(URL.createObjectURL(file));
    setPictureOffsetX(0);
    setPictureOffsetY(0);
    setPictureZoom(100);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    let uploadedPath = null;

    try {
      const { error: problem } = await supabase.rpc('update_my_profile', {
        p_name: name,
        p_grade: staff ? null : Number(grade),
      });

      if (problem) throw problem;

      if (pictureFile) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!userData.user) throw new Error('Please sign in again to save your profile photo.');

        uploadedPath = `${userData.user.id}/${crypto.randomUUID()}.${PROFILE_PICTURE_TYPES[pictureFile.type]}`;
        const { error: uploadError } = await supabase.storage
          .from(PROFILE_PICTURE_BUCKET)
          .upload(uploadedPath, pictureFile, {
            cacheControl: '0',
            contentType: pictureFile.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      }

      const { error: cropError } = await supabase.rpc(
        'update_my_profile_picture_crop',
        {
          p_path: uploadedPath,
          p_offset_x: pictureOffsetX,
          p_offset_y: pictureOffsetY,
          p_zoom: pictureZoom,
        }
      );
      if (cropError) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from(PROFILE_PICTURE_BUCKET)
            .remove([uploadedPath]);
          if (cleanupError) {
            console.error('Could not remove the unlinked profile photo:', cleanupError);
          }
          uploadedPath = null;
        }
        throw cropError;
      }

      const savedPath = uploadedPath;
      uploadedPath = null;
      await onRefreshProfile?.();
      if (savedPath && profile?.profile_picture_path) {
        const { error: removeError } = await supabase.storage
          .from(PROFILE_PICTURE_BUCKET)
          .remove([profile.profile_picture_path]);
        if (removeError) {
          console.error('Could not remove the previous profile photo:', removeError);
        }
      }
      onDone('Profile saved.');
    } catch (problem) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from(PROFILE_PICTURE_BUCKET)
          .remove([uploadedPath]);
        if (cleanupError) {
          console.error('Could not remove the unlinked profile photo:', cleanupError);
        }
      }
      setError(friendly(problem));
      await onRefreshProfile?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="settings-picture-editor">
        <ProfilePicture
          path={picturePath}
          previewUrl={picturePreviewUrl}
          offsetX={pictureOffsetX}
          offsetY={pictureOffsetY}
          zoom={pictureZoom}
          avatarId={profile?.avatar_id}
          className="settings-picture-editor__preview"
          interactive
          onOffsetChange={({ x, y }) => {
            setPictureOffsetX(x);
            setPictureOffsetY(y);
          }}
        />
        <label className="settings-picture-editor__upload">
          {pictureFile ? 'CHANGE PHOTO' : 'UPLOAD YOUR PHOTO'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={changePicture}
            disabled={busy}
          />
        </label>

        <p className="settings-picture-editor__hint">
          Drag the photo to position it inside the circle.
        </p>

        <label className="settings-picture-editor__zoom">
          Zoom
          <input
            type="range"
            min="100"
            max="300"
            step="5"
            value={pictureZoom}
            onChange={(event) => setPictureZoom(Number(event.target.value))}
          />
          <span>{pictureZoom}%</span>
        </label>
      </div>

      <label className="settings-field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus />
      </label>

      {!staff && (
        <label className="settings-field">
          Grade
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                Grade {value}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="settings-modal__error">{error}</p>}

      <button
        type="submit"
        className="settings-modal__button"
        disabled={busy}
      >
        SAVE
      </button>
    </form>
  );
}

function PasswordForm({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);

    const { error: problem } = await supabase.auth.updateUser({ password });

    if (problem) {
      setError(problem.message);
      setBusy(false);
      return;
    }

    onDone('Password changed.');
  }

  return (
    <form onSubmit={save}>
      <label className="settings-field">
        New password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </label>

      <label className="settings-field">
        Type it again
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>

      {error && <p className="settings-modal__error">{error}</p>}

      <button type="submit" className="settings-modal__button" disabled={busy}>
        CHANGE PASSWORD
      </button>
    </form>
  );
}

function EmailForm({ onDone }) {
  const [current, setCurrent] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrent(data?.user?.email || ''));
  }, []);

  async function save(event) {
    event.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Type a real email address.');
      return;
    }

    setBusy(true);

    const { error: problem } = await supabase.auth.updateUser({ email: email.trim() });

    if (problem) {
      setError(problem.message);
      setBusy(false);
      return;
    }

    onDone('Check your inbox to confirm the new email.');
  }

  return (
    <form onSubmit={save}>
      <p className="settings-modal__text">
        Your email now: <strong>{current || '...'}</strong>
      </p>

      <label className="settings-field">
        New email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </label>

      {error && <p className="settings-modal__error">{error}</p>}

      <button type="submit" className="settings-modal__button" disabled={busy}>
        CHANGE EMAIL
      </button>
    </form>
  );
}

function DeleteForm({ onDeleted }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const { error: problem } = await supabase.rpc('delete_my_account');

    if (problem) {
      setError(friendly(problem));
      setBusy(false);
      return;
    }

    onDeleted();
  }

  return (
    <form onSubmit={remove}>
      <p className="settings-modal__text">
        This permanently deletes your account, your level, points and avatars.
        It cannot be undone. Type <strong>DELETE</strong> to continue.
      </p>

      <label className="settings-field">
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" autoFocus />
      </label>

      {error && <p className="settings-modal__error">{error}</p>}

      <button
        type="submit"
        className="settings-modal__button settings-modal__button--danger"
        disabled={busy || typed !== 'DELETE'}
      >
        DELETE MY ACCOUNT
      </button>
    </form>
  );
}

/* ---------- the screen ---------- */

export default function Settings({ profile, onBack, onLogout, onRefreshProfile }) {
  const displayName = profile?.name || 'Player';

  // Real progress from the database. New accounts start at Level 1.
  const info = levelInfo(profile?.xp || 0);
  const streakDays = profile?.streak_days || 0;
  const streakBestDays = Math.max(streakDays, profile?.streak_best_days || 0);
  const rank = rankForLevel(info.level);

  const [prefs, setPrefs] = useState(getPrefs);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');

  // Hide the small message after a moment.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  function changePref(key, value) {
    setPrefs(setPref(key, value));

    if (key === 'sound' && value) playSfx('correct', true);
    if (key === 'music') syncMusic();
    if (key === 'darkMode') applyTheme({ darkMode: value });

    if (key === 'vibration' && value) {
      if (!vibrate(150, true)) {
        setNotice('Vibration works on phones. It is saved for when you play on one.');
      }
    }
  }

  async function changeAlerts(value) {
    if (!value) {
      setPrefs(setPref('notifications', false));
      return;
    }

    setPrefs(setPref('notifications', true));

    try {
      const answer = await askNotificationPermission();

      if (answer === 'unsupported') {
        setPrefs(setPref('notifications', false));
        setNotice('This browser does not support notifications.');
      } else if (answer !== 'granted') {
        setNotice('Match alerts are on, but your browser is blocking them. Allow notifications for this site in browser settings.');
      }
    } catch (error) {
      console.error('Could not request notification permission:', error);
      setNotice('Match alerts are on, but permission could not be requested. Check your browser settings.');
    }
  }

  function testAlerts() {
    const result = sendTestNotification();

    if (result === 'sent') {
      setNotice('Test notification sent.');
    } else if (result === 'unsupported') {
      setNotice('This browser does not support notifications.');
    } else if (result === 'permission') {
      setNotice('Allow notifications for this site in your browser first.');
    } else {
      setNotice('The browser could not show the test notification.');
    }
  }

  function closeWith(message) {
    setModal(null);
    if (message) setNotice(message);
  }

  return (
    <section className="settings-content" aria-label="Settings">
      <button type="button" className="settings-back" onClick={onBack} aria-label="Back">
        <img src={backArrow} alt="" />
      </button>

      {/* PROFILE CARD */}
      <div className="settings-profile-card">
        <div className="settings-avatar">
          <img className="settings-avatar__circle" src={avatarCircle} alt="" />
          <ProfilePicture
            path={profile?.profile_picture_path}
            offsetX={profile?.profile_picture_offset_x}
            offsetY={profile?.profile_picture_offset_y}
            zoom={profile?.profile_picture_zoom}
            avatarId={profile?.avatar_id}
            className="settings-avatar__picture"
          />
        </div>

        <h2 className="settings-name">{displayName}</h2>
        <p className="settings-level">Level {info.level}</p>
        <p className="settings-exp-label">EXP</p>

        <div
          className="settings-exp-bar"
          role="progressbar"
          aria-label="Experience"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={info.percent}
        >
          <div className="settings-exp-fill" style={{ width: `${info.percent}%` }} />
        </div>
      </div>

      {/* STREAK + RANK */}
      <div className="settings-stat settings-stat--streak">
        <span className="settings-stat__icon settings-stat__icon--fire">
          <img src={fireIcon} alt="" />
        </span>
        <p className="settings-stat__label">Daily streak</p>
        <p className="settings-stat__value">
          {streakDays} {streakDays === 1 ? 'day' : 'days'}
        </p>
        <p className="settings-stat__best">Best: {streakBestDays} days</p>
      </div>

      <div className="settings-stat settings-stat--rank">
        <span className="settings-stat__icon settings-stat__icon--rank">
          <RankEmblem rank={rank} />
        </span>
        <p className="settings-stat__label">RANK</p>
        <p className="settings-stat__value">{rank.label}</p>
      </div>

      {/* ACCOUNT */}
      <Section title="Account" variant="account">
        <LinkRow
          icon={
            <span className="settings-profile-crop">
              <img src={profileIcon} alt="" />
            </span>
          }
          title="Profile"
          description="Change your name, and your grade."
          onClick={() => setModal('profile')}
        />
        <LinkRow
          icon={<img className="settings-icon-lock" src={lockIcon} alt="" />}
          title="Change Password"
          description="Update your account password."
          onClick={() => setModal('password')}
        />
        <LinkRow
          icon={<EmailIcon />}
          title="Email & Account"
          description="Manage your email and account information."
          onClick={() => setModal('email')}
        />

        <button type="button" className="settings-delete" onClick={() => setModal('delete')}>
          <img className="settings-delete__icon" src={deleteIcon} alt="" />
          <span className="settings-delete__text">
            <span className="settings-delete__title">Delete Account</span>
            <span className="settings-delete__desc">
              Permanently delete your account and your game data.
            </span>
          </span>
          <Chevron />
        </button>
      </Section>

      {/* GAME */}
      <Section title="Game" variant="game">
        <ToggleRow
          icon={<img className="settings-icon-sound" src={soundIcon} alt="" />}
          title="Sound Effects"
          checked={prefs.sound}
          onChange={(value) => changePref('sound', value)}
        />
        <ToggleRow
          icon={<img className="settings-icon-music" src={musicIcon} alt="" />}
          title="Music"
          checked={prefs.music}
          onChange={(value) => changePref('music', value)}
        />
        <ToggleRow
          icon={<VibrationIcon />}
          title="Vibration"
          checked={prefs.vibration}
          onChange={(value) => changePref('vibration', value)}
        />
        <ToggleRow
          icon={<CameraIcon />}
          title="Camera Zoom"
          checked={prefs.cameraZoom}
          onChange={(value) => changePref('cameraZoom', value)}
        />
      </Section>

      {/* APPS */}
      <Section title="Apps" variant="apps">
        <button
          type="button"
          className="settings-row settings-row--simple settings-row--compact"
          onClick={() => setModal('alerts')}
        >
          <span className="settings-row__icon">
            <img className="settings-icon-bell" src={bellIcon} alt="" />
          </span>
          <span className="settings-row__title">Notification</span>
          <Chevron />
        </button>
        <ToggleRow
          compact
          icon={<img className="settings-icon-moon" src={moonIcon} alt="" />}
          title="Dark mode"
          checked={prefs.darkMode}
          onChange={(value) => changePref('darkMode', value)}
        />
      </Section>

      {/* Not in the Figma frame: keeps a way to sign out while Home's header is hidden. */}
      {onLogout && (
        <button type="button" className="settings-signout" onClick={onLogout}>
          Sign out
        </button>
      )}

      {/* POP-UPS */}
      {modal === 'profile' && (
        <Modal title="Your profile" onClose={() => setModal(null)}>
          <ProfileForm profile={profile} onRefreshProfile={onRefreshProfile} onDone={closeWith} />
        </Modal>
      )}

      {modal === 'password' && (
        <Modal title="Change password" onClose={() => setModal(null)}>
          <PasswordForm onDone={closeWith} />
        </Modal>
      )}

      {modal === 'email' && (
        <Modal title="Email & account" onClose={() => setModal(null)}>
          <EmailForm onDone={closeWith} />
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete account" onClose={() => setModal(null)}>
          <DeleteForm onDeleted={() => onLogout?.()} />
        </Modal>
      )}

      {modal === 'alerts' && (
        <Modal title="Notifications" onClose={() => setModal(null)}>
          <p className="settings-modal__text">
            Get an alert when your match is ready while Kiddocation is open in
            another tab.
          </p>

          <div className="settings-modal__switch">
            <span>Match alerts</span>
            <Toggle
              checked={prefs.notifications}
              onChange={changeAlerts}
              label="Match alerts"
            />
          </div>
          <button
            type="button"
            className="settings-modal__button"
            disabled={!prefs.notifications}
            onClick={testAlerts}
          >
            Send test notification
          </button>
        </Modal>
      )}

      {notice && (
        <div className="settings-notice" role="status">
          {notice}
        </div>
      )}
    </section>
  );
}