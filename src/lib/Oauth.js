import { supabase } from './supabase';

/* =========================================================
   GOOGLE AND FACEBOOK SIGN-IN
   Uses Supabase Auth. The providers must be turned on in the
   Supabase dashboard (see the setup steps below).
========================================================= */

const SUPPORTED_PROVIDERS = new Set(['google', 'facebook']);

export function socialAuthStatus() {
  const missing = [];

  if (!import.meta.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  return {
    ready: missing.length === 0,
    missing,
  };
}

// Sends the person to Google or Facebook. When they come back, Supabase
// signs them in and the app creates their profile.
// Returns an error message, or '' when the redirect starts.
export async function signInWithProvider(provider) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();

  if (!SUPPORTED_PROVIDERS.has(normalizedProvider)) {
    return 'This sign-in method is not available yet.';
  }

  const status = socialAuthStatus();
  if (!status.ready) {
    return 'Social login is not set up in this app yet. Add the Supabase environment variables and enable Google/Facebook in the Supabase dashboard.';
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: normalizedProvider,
    options: {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    },
  });

  return error ? authErrorText(error) : '';
}

export function authErrorText(error) {
  const text = error?.message || '';

  if (/invalid login credentials/i.test(text)) {
    return 'Incorrect email or password.';
  }

  if (/provider is not enabled|unsupported provider/i.test(text)) {
    return 'Google/Facebook sign-in is not enabled in your Supabase project yet. Turn on the provider in Authentication → Providers and save the credentials.';
  }

  if (/email not confirmed/i.test(text)) {
    return 'Please confirm your email first. Check your inbox.';
  }

  return text || 'Something went wrong. Please try again.';
}