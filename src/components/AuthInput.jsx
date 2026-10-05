import './AuthInput.css';

/**
 * Reusable labeled input used by both Login and Signup, matching the
 * Figma auth screens' style (uppercase gray label + dark rounded field).
 *
 * Usage:
 *   <AuthInput label="NAME" type="text" value={name} onChange={setName} />
 */
export default function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  as = 'input', // 'input' or 'select'
  children, // <option> elements, only used when as="select"
}) {
  return (
    <div className="auth-input">
      <label className="auth-input__label">{label}</label>
      {as === 'select' ? (
        <select
          className="auth-input__field auth-input__field--select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          {children}
        </select>
      ) : (
        <input
          className="auth-input__field"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}