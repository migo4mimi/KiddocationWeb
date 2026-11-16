import './Autopages.css';

/* =========================================================
   SHARED PIECES FOR LOGIN, SIGN UP, PASSWORD RESET...
   Based on the "Sign In" frame in Figma.
========================================================= */

// The Kiddocation logo: the orange pill with a K on a light tile.
export function KLogo({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 243 221"
      role="img"
      aria-label="Kiddocation"
    >
      <rect width="243" height="221" rx="30" fill="#f4f4f4" />
      <rect x="21" y="38" width="201" height="146" rx="73" fill="#ff8a00" />
      <text
        x="121"
        y="152"
        textAnchor="middle"
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight="800"
        fontSize="124"
        fill="#d8ebb9"
        stroke="#b4d77b"
        strokeWidth="4"
        paintOrder="stroke"
      >
        K
      </text>
      <rect x="196" y="22" width="26" height="9" rx="4.5" fill="#ff8a00" transform="rotate(-28 209 26)" />
      <rect x="205" y="40" width="22" height="9" rx="4.5" fill="#ff8a00" transform="rotate(8 216 44)" />
    </svg>
  );
}

// The page: a brand panel on laptops and PCs, just the form on phones.
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="au">
      <aside className="au-brand" aria-hidden="true">
        <KLogo className="au-brand__logo" />
        <h2>Learn math. Play. Level up.</h2>
        <p>Practice with friends, climb the ranking, and collect avatars.</p>
      </aside>

      <section className="au-panel">
        <div className="au-card">
          <KLogo className="au-logo" />

          <h1 className="au-title">{title}</h1>
          {subtitle && <p className="au-subtitle">{subtitle}</p>}

          {children}

          {footer && <div className="au-footer">{footer}</div>}
        </div>
      </section>
    </main>
  );
}

// A labelled text box (or a drop-down when as="select").
export function Field({
  label,
  as = 'input',
  value,
  onChange,
  children,
  ...props
}) {
  const Control = as;

  return (
    <label className="au-field">
      <span className="au-field__label">{label}</span>
      <Control
        className="au-field__control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      >
        {children}
      </Control>
    </label>
  );
}

export function AuthButton({ children, loading, variant = 'main', ...props }) {
  return (
    <button
      className={`au-button au-button--${variant}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}

export function Notice({ kind = 'error', children }) {
  if (!children) return null;

  return (
    <p className={`au-notice au-notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#1877F2" />
      <path
        fill="#ffffff"
        d="M26.6 38V26.2h4l.6-4.6h-4.6v-2.9c0-1.3.4-2.2 2.3-2.2h2.4v-4.1c-.4-.1-1.9-.2-3.5-.2-3.5 0-5.9 2.1-5.9 6v3.4h-4v4.6h4V38h4.7z"
      />
    </svg>
  );
}

// "OR" and the two buttons. onProvider('google') or onProvider('facebook').
export function SocialButtons({ onProvider, busy, disabled }) {
  return (
    <>
      <div className="au-or" aria-hidden="true">
        <span />
        <b>OR</b>
        <span />
      </div>

      <div className="au-social">
        <button
          type="button"
          className="au-social__button"
          onClick={() => onProvider('google')}
          disabled={disabled || Boolean(busy)}
        >
          <GoogleIcon />
          <span>{busy === 'google' ? 'OPENING...' : 'GOOGLE'}</span>
        </button>

        <button
          type="button"
          className="au-social__button"
          onClick={() => onProvider('facebook')}
          disabled={disabled || Boolean(busy)}
        >
          <FacebookIcon />
          <span>{busy === 'facebook' ? 'OPENING...' : 'FACEBOOK'}</span>
        </button>
      </div>
    </>
  );
}