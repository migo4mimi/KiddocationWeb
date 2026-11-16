import { getPrefs } from './prefs.js';

/* =========================================================
   SOUND, MUSIC, VIBRATION AND ALERTS
   Everything is made by the browser, so there are no sound files.
   Each one only works when its switch is on in Settings.
========================================================= */

let context = null;

function audio() {
  if (!context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }

  if (context.state === 'suspended') {
    context.resume();
  }

  return context;
}

function tone(a, frequency, start, length, type = 'square', volume = 0.07) {
  const oscillator = a.createOscillator();
  const gain = a.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);

  oscillator.connect(gain);
  gain.connect(a.destination);

  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

/* ---------- sound effects ---------- */

export function playSfx(name, force = false) {
  if (!force && !getPrefs().sound) return;

  const a = audio();
  if (!a) return;

  const t = a.currentTime;

  switch (name) {
    case 'correct':
      tone(a, 660, t, 0.1);
      tone(a, 880, t + 0.1, 0.2);
      break;
    case 'wrong':
      tone(a, 220, t, 0.18, 'sawtooth');
      tone(a, 165, t + 0.16, 0.28, 'sawtooth');
      break;
    case 'tick':
      tone(a, 880, t, 0.05, 'square', 0.05);
      break;
    case 'go':
      tone(a, 523, t, 0.1);
      tone(a, 784, t + 0.1, 0.25);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((frequency, i) =>
        tone(a, frequency, t + i * 0.12, 0.2)
      );
      break;
    default:
      tone(a, 520, t, 0.05);
  }
}

/* ---------- vibration (phones) ---------- */

export function vibrate(pattern, force = false) {
  if (!force && !getPrefs().vibration) return false;
  if (!navigator.vibrate) return false;

  return navigator.vibrate(pattern);
}

/* ---------- background music: a small looping tune ---------- */

const TUNE = [
  [220, 262, 330, 262],
  [175, 220, 262, 220],
  [262, 330, 392, 330],
  [196, 247, 294, 247],
];

let musicTimer = null;
let musicStep = 0;

export function startMusic() {
  if (musicTimer) return;

  const a = audio();
  if (!a) return;

  musicTimer = setInterval(() => {
    const bar = TUNE[Math.floor(musicStep / 4) % TUNE.length];
    tone(a, bar[musicStep % 4], a.currentTime, 0.22, 'triangle', 0.035);
    musicStep += 1;
  }, 260);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

// Start or stop the music to match the Settings switch.
export function syncMusic() {
  if (getPrefs().music) startMusic();
  else stopMusic();
}

/* ---------- alerts while the app is in another tab ---------- */

export async function askNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (window.Notification.permission === 'granted') return 'granted';
  if (window.Notification.permission === 'denied') return 'denied';

  return window.Notification.requestPermission();
}

function showBrowserNotification(title, body) {
  try {
    new window.Notification(title, { body });
    return true;
  } catch (error) {
    console.error('Could not show browser notification:', error);
    return false;
  }
}

export function notify(title, body) {
  if (!getPrefs().notifications) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (window.Notification.permission !== 'granted') return false;
  if (document.visibilityState !== 'hidden' && !document.hidden) return false;

  return showBrowserNotification(title, body);
}

export function sendTestNotification() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (window.Notification.permission !== 'granted') return 'permission';

  return showBrowserNotification(
    'Kiddocation test',
    'Match notifications are working.'
  )
    ? 'sent'
    : 'failed';
}