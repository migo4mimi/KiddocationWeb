import { supabase } from './supabase';

/* =========================================================
   TEACHER ACCESS
   Teachers sign up, wait for approval, and an admin approves
   them inside the app. They can also ask by email.
========================================================= */

export const ADMIN_EMAIL = 'leefranceflores@gmail.com';

export function isStaff(role) {
  return role === 'admin' || role === 'teacher';
}

// An email to the admin, already written for the teacher.
export function teacherRequestLink({ name = '', email = '' } = {}) {
  const subject = 'Teacher access request - Kiddocation';
  const body = [
    'Hello,',
    '',
    'I signed up as a teacher on Kiddocation and I am asking for teacher access.',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    '',
    'Thank you!',
  ].join('\n');

  return `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

const MESSAGES = {
  not_signed_in: 'Please sign in again before requesting teacher access.',
  not_admin: 'Only an admin can do this.',
  request_not_found: 'That request was not found.',
  already_decided: 'That request was already decided.',
  already_pending: 'Your request is already waiting for approval.',
  already_staff: 'You already have teacher access.',
  cannot_change_self: 'You cannot change your own access.',
  not_a_teacher: 'That person is not a teacher.',
  no_profile: 'The teacher profile could not be found.',
};

function friendly(error) {
  const text = error?.message || '';
  const key = Object.keys(MESSAGES).find((name) => text.includes(name));
  return new Error(key ? MESSAGES[key] : text || 'Something went wrong.');
}

async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw friendly(error);
  return data;
}

// The newest request of the signed-in person (or null).
export async function fetchMyRequest(userId) {
  const { data, error } = await supabase
    .from('teacher_requests')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw friendly(error);
  return data;
}

// Admins only: everybody's requests.
export async function fetchRequests() {
  const { data, error } = await supabase
    .from('teacher_requests')
    .select('id, user_id, name, email, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw friendly(error);
  return data || [];
}

export const requestTeacherAccess = () => call('request_teacher_access');

export const reviewRequest = (id, approve) =>
  call('review_teacher_request', { p_request: id, p_approve: approve });

export const revokeTeacher = (userId) =>
  call('revoke_teacher', { p_user: userId });