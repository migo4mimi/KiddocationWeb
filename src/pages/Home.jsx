import { useRef, useState } from 'react';
import './Home.css';

export default function Home({ profile, onLogout }) {
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const displayName = profile?.name || 'Karem_Pag';
  const grade = profile?.grade || 6;

  // Temporary display values.
  // We can connect these to the database later.
  const level = 4;
  const points = 320;

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setAvatarPreview(imageUrl);
  }

  return (
    <main className="home-page">
      <div className="home-shell">

        {/* HEADER */}
          <header className="home-header">

          <div className="profile-summary">

<div className="profile-avatar">
  {displayName.charAt(0).toUpperCase()}
</div>

<div className="profile-info">

  <div className="profile-name">
    {displayName}
  </div>

  <div className="profile-grade">
    Grade {grade}
  </div>

  <div className="profile-level">
    Level {level}
  </div>

  <div className="level-track">
    <div className="level-fill" />
  </div>

</div>

</div>

  <div className="header-actions">

    <div className="points-badge">
      {points} PTS
    </div>

    <button
      type="button"
      className="logout-button"
      onClick={onLogout}
    >
      Sign out
    </button>

  </div>

</header>

        {/* MAIN CONTENT */}
        <section className="home-content">

          <div className="welcome-area">
            <p className="welcome-label">WELCOME BACK</p>
            <h2>
              Ready to learn, {displayName}?
            </h2>
            <p className="welcome-description">
              Learn and improve at your own pace.
            </p>
          </div>

          {/* AVATAR */}
          <section className="avatar-panel">

            <button
              type="button"
              className={`avatar-upload ${
                avatarPreview ? 'has-avatar' : ''
              }`}
              onClick={handleAvatarClick}
              aria-label="Choose avatar PNG"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Selected avatar"
                  className="avatar-image"
                />
              ) : (
                <>
                  <div className="upload-plus">+</div>
                  <span>Choose your avatar</span>
                  <small>PNG, JPG or WEBP</small>
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              hidden
            />

          </section>

          {/* MODE CARDS */}
          <section className="mode-grid">

            <button
              type="button"
              className="mode-card ranked-card"
            >
              <div className="mode-card-icon">
                ★
              </div>

              <div className="mode-card-content">
                <h3>Ranked Mode</h3>
                <p>
                  Compete with other learners and earn points.
                </p>
              </div>

              <span className="mode-card-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="mode-card practice-card"
            >
              <div className="mode-card-icon">
                ▶
              </div>

              <div className="mode-card-content">
                <h3>Practice Mode</h3>
                <p>
                  Learn and practice at your own pace.
                </p>
              </div>

              <span className="mode-card-arrow">
                →
              </span>
            </button>

          </section>

        </section>

        {/* BOTTOM NAVIGATION */}
        <nav className="home-navigation">

          <button
            type="button"
            className="nav-item active"
          >
            <span className="nav-icon avatar-nav-icon">
              ●
            </span>
            <span>AVATAR</span>
          </button>

          <button
            type="button"
            className="nav-item"
          >
            <span className="nav-icon star-nav-icon">
              ★
            </span>
            <span>RANKS</span>
          </button>

          <button
            type="button"
            className="nav-item"
          >
            <span className="nav-icon settings-nav-icon">
              ⚙
            </span>
            <span>SETTINGS</span>
          </button>

        </nav>

      </div>
    </main>
  );
}