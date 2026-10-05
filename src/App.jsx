import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authPage, setAuthPage] = useState('login');

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session error:', error);
    }

    const currentSession = data?.session ?? null;

    setSession(currentSession);

    if (currentSession?.user) {
      await loadProfile(currentSession.user.id);
    }

    setCheckingSession(false);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile error:', error);
      return;
    }

    setProfile(data);
  }

  async function handleSignup({ name, grade, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          grade,
        },
      },
    });

    if (error) {
      return {
        error: error.message,
      };
    }

    if (data.session && data.user) {
      setSession(data.session);
      await loadProfile(data.user.id);

      return {
        success: true,
        message: 'Account created successfully!',
      };
    }

    return {
      success: true,
      message:
        'Account created! Please check your email to confirm your account.',
    };
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setAuthPage('login');
  }

  // -----------------------------------------
  // SESSION CHECK
  // -----------------------------------------

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#dcd8f4',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '20px',
        }}
      >
        Loading Kiddocation...
      </div>
    );
  }

  // -----------------------------------------
  // NOT LOGGED IN
  // -----------------------------------------

  if (!session) {
    if (authPage === 'signup') {
      return (
        <Signup
          onLogin={() => setAuthPage('login')}
          onSignupSuccess={handleSignup}
        />
      );
    }

    return (
      <Login
        onLoginSuccess={async (newSession) => {
          setSession(newSession);

          if (newSession?.user) {
            await loadProfile(newSession.user.id);
          }
        }}
        onSignup={() => setAuthPage('signup')}
      />
    );
  }

  // -----------------------------------------
  // LOGGED IN → HOME
  // -----------------------------------------

  return (
    <Home
      session={session}
      user={session?.user}
      profile={profile}
      onLogout={handleLogout}
    />
  );
}

export default App;