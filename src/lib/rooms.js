import { supabase } from './supabase';

/* =========================================================
   GAME ROOMS
   Talks to the functions created by multiplayer.sql and
   multiplayer-2.sql. Every mode (Practice, Ranked, Custom)
   is a room, so they all play the same way.
========================================================= */

const MESSAGES = {
  not_signed_in: 'Please sign in again.',
  room_not_found: 'We could not find a room with that code.',
  room_full: 'That room is full.',
  room_started: 'That game has already started.',
  need_more_players: 'You need at least 2 players to start.',
  not_host: 'Only the host can start the game.',
  not_ready: 'Not enough players yet.',
  not_in_room: 'You are not in this room anymore.',
  room_closed: 'This room has closed.',
  not_alone: 'Other players joined, so the match will start for everyone.',
  grade_locked: 'You can only play your own grade or lower.',
  category_locked: 'That category is not open for this grade yet.',
  bad_rounds: 'Choose 3, 5 or 10 rounds.',
  bad_round_seconds: 'Choose a question time between 5 and 120 seconds.',
  room_not_playing: 'This game is no longer accepting answers.',
  round_not_current: 'That round has already advanced. Please continue to the next question.',
};

function friendly(error) {
  const text = error?.message || '';
  const key = Object.keys(MESSAGES).find((name) => text.includes(name));
  const result = new Error(key ? MESSAGES[key] : text || 'Something went wrong.');
  result.code = error?.code || key || 'unknown';
  return result;
}

async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    throw friendly(error);
  }

  return data;
}

/* ---------- a clock that matches the server ---------- */

let clockOffset = 0;

export async function syncClock() {
  const before = Date.now();
  const { data, error } = await supabase.rpc('server_now');
  const after = Date.now();

  if (!error && data) {
    clockOffset = new Date(data).getTime() - (before + after) / 2;
  }
}

export function serverNow() {
  return Date.now() + clockOffset;
}

/* ---------- starting games ---------- */

export const createPracticeRoom = (grade, category, rounds, roundSeconds) =>
  call('create_practice_room_with_timer', {
    p_grade: grade,
    p_category: category,
    p_rounds: rounds,
    p_round_seconds: roundSeconds,
  });

export const createCustomRoom = (grade, category, rounds) =>
  call('create_custom_room', {
    p_grade: grade,
    p_category: category,
    p_rounds: rounds,
  });

export const findRankedRoom = (grade, category) =>
  call('find_ranked_room', { p_grade: grade, p_category: category });

export const joinRoomByCode = (code) =>
  call('join_room_by_code', { p_code: code });

/* ---------- lobby ---------- */

export const startRoom = (roomId) => call('start_room', { p_room: roomId });
export const extendLobby = (roomId) => call('extend_lobby', { p_room: roomId });

// Ranked when nobody else came: play a solo ranked run.
export const startRankedSolo = (roomId) =>
  call('start_ranked_solo', { p_room: roomId });

// The leaderboard. period: 'month' or 'all'.
export const fetchLeaderboard = (period) =>
  call('leaderboard', { p_period: period });
export const roomHeartbeat = (roomId) =>
  call('room_heartbeat', { p_room: roomId });
export const leaveRoom = (roomId) => call('leave_room', { p_room: roomId });

/* ---------- playing ---------- */

export const submitAnswer = (roomId, round, side) =>
  call('submit_answer', { p_room: roomId, p_round: round, p_side: side });

export const confirmRoomAnswer = (roomId, round, side) =>
  call('confirm_room_answer', {
    p_room: roomId,
    p_round: round,
    p_side: side,
  });

export async function fetchRoomConfirmationStatus(roomId, round) {
  const rows = await call('room_confirmation_status', {
    p_room: roomId,
    p_round: round,
  });
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export const finishRoom = (roomId) => call('finish_room', { p_room: roomId });

export const awardPracticePoints = (roomId) =>
  call('award_practice_points', { p_room: roomId });

export async function awardGamePoints(roomId) {
  try {
    return await call('award_game_points', { p_room: roomId });
  } catch (error) {
    if (
      error.code === 'PGRST202'
      || (
        error.message.includes('award_game_points')
        && /schema cache|could not find|does not exist/i.test(error.message)
      )
    ) {
      throw new Error(
        'Points are not enabled on the game server yet. Apply the game-points Supabase migrations.',
        { cause: error }
      );
    }

    throw error;
  }
}

/* ---------- reading ---------- */

export async function fetchPlayers(roomId) {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at');

  if (error) {
    throw friendly(error);
  }

  return data || [];
}

export async function fetchQuestions(roomId) {
  const { data, error } = await supabase
    .from('room_questions')
    .select('round, question, red_answer, blue_answer')
    .eq('room_id', roomId)
    .order('round');

  if (error) {
    throw friendly(error);
  }

  return data || [];
}

export async function fetchRoom(roomId) {
  const [roomResult, players] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    fetchPlayers(roomId),
  ]);

  if (roomResult.error) {
    throw friendly(roomResult.error);
  }

  return { room: roomResult.data, players };
}

// Live updates. Returns a function that stops listening.
export function subscribeToRoom(roomId, { onRoom, onPlayer }) {
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      onRoom
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      },
      onPlayer
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}