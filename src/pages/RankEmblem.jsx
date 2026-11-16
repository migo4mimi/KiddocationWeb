export default function RankEmblem({ rank, className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${rank.label} rank`}
    >
      <path
        d="M32 3 57 16 53 43 32 61 11 43 7 16 32 3Z"
        fill={rank.color}
        stroke="#20252c"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 10 49 19 46 39 32 51 18 39 15 19 32 10Z"
        fill="#f8f5ed"
        stroke="#20252c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m32 17 10 17-10 10-10-10 10-17Z"
        fill={rank.color}
        stroke="#20252c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M32 22v17" stroke="#fff" strokeWidth="2" opacity=".8" />
    </svg>
  );
}
