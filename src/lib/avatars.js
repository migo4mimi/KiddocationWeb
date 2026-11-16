import { supabase } from './supabase';
import defaultAvatar from '../assets/default-avatar.png';
import striker from '../assets/avatars/striker.png';
import adventurer from '../assets/avatars/adventurer.png';
import sky from '../assets/avatars/sky.png';
import cat from '../assets/avatars/cat.png';
import curly from '../assets/avatars/curly.png';
import runner from '../assets/avatars/runner.png';
import forward from '../assets/avatars/forward.png';
import detective from '../assets/avatars/detective.png';

/* =========================================================
   AVATARS
   box  = width and height of the picture area in the Figma design
   img  = how the downloaded image sits inside that area (percent)
   The prices below are only a backup: the real prices come from the
   avatars table in Supabase (multiplayer-3.sql).
========================================================= */

export const AVATARS = {
  default: {
    name: 'Rookie',
    price: 0,
    src: defaultAvatar,
    box: [1, 1],
    img: { w: 100, h: 100, l: 0, t: 0 },
  },
  striker: {
    name: 'Red Striker',
    price: 150,
    src: striker,
    box: [70, 86],
    img: { w: 123.43, h: 217.44, l: -17.43, t: -61.63 },
  },
  adventurer: {
    name: 'Adventurer',
    price: 200,
    src: adventurer,
    box: [85, 82.465],
    img: { w: 185.87, h: 191.59, l: -31.55, t: -20.87 },
    flip: true,
  },
  sky: {
    name: 'Sky Blue',
    price: 250,
    src: sky,
    box: [54, 84],
    img: { w: 154.02, h: 214.29, l: -24.23, t: -55.95 },
  },
  cat: {
    name: 'Screaming Cat',
    price: 300,
    src: cat,
    box: [93, 97],
    img: { w: 153.76, h: 144.42, l: -26.88, t: -19.63 },
  },
  curly: {
    name: 'Curly',
    price: 350,
    src: curly,
    box: [57, 88],
    img: { w: 157.89, h: 221.34, l: -31.58, t: -60.67 },
  },
  runner: {
    name: 'Blue Runner',
    price: 400,
    src: runner,
    box: [52, 86],
    img: { w: 136.54, h: 179.88, l: -17.01, t: -39.76 },
  },
  forward: {
    name: 'Red Forward',
    price: 450,
    src: forward,
    box: [64, 102],
    img: { w: 167.19, h: 227.03, l: -35.94, t: -66.95 },
  },
  detective: {
    name: 'Detective Pig',
    price: 600,
    src: detective,
    box: [100, 95],
    img: { w: 113, h: 257.43, l: -5, t: -77.14 },
  },
};

export const AVATAR_ORDER = [
  'default',
  'striker',
  'adventurer',
  'sky',
  'cat',
  'curly',
  'runner',
  'forward',
  'detective',
];

export function avatarOf(id) {
  return AVATARS[id] || AVATARS.default;
}

/* ---------- buying and wearing (checked by the server) ---------- */

const MESSAGES = {
  not_enough_points: 'You do not have enough points yet. Play games to earn more!',
  already_owned: 'You already own this avatar.',
  not_owned: 'Buy this avatar first.',
  avatar_not_found: 'This avatar is not in the store.',
  no_profile: 'Your profile could not be found.',
};

function friendly(error) {
  const text = error?.message || '';
  const key = Object.keys(MESSAGES).find((name) => text.includes(name));
  return new Error(key ? MESSAGES[key] : text || 'Something went wrong.');
}

export async function buyAvatar(id) {
  const { data, error } = await supabase.rpc('buy_avatar', { p_avatar: id });
  if (error) throw friendly(error);
  return data;
}

export async function equipAvatar(id) {
  const { data, error } = await supabase.rpc('equip_avatar', { p_avatar: id });
  if (error) throw friendly(error);
  return data;
}

export async function fetchStore() {
  const { data, error } = await supabase
    .from('avatars')
    .select('id, name, price, sort')
    .order('sort');

  if (error) throw friendly(error);
  return data || [];
}