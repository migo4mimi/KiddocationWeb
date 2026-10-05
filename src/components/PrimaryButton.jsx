import './PrimaryButton.css';

/**
 * The orange/yellow pill button used for LOG IN, SIGN UP, etc.
 * Shows a spinner and disables itself while `loading` is true.
 */
export default function PrimaryButton({ children, onClick, type = 'button', loading = false, disabled = false }) {
  return (
    <button
      type={type}
      className="primary-button"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="primary-button__spinner" aria-label="Loading" /> : children}
    </button>
  );
}