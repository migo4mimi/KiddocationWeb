import { avatarOf } from '../lib/avatars';
import './Avatar.css';

// How big the picture area is inside a square of the given size.
function fit(avatar, size) {
  const aspect = avatar.box[0] / avatar.box[1];

  return aspect > 1
    ? { width: size, height: size / aspect }
    : { width: size * aspect, height: size };
}

/* ---------- normal pages ---------- */
// The avatar stands at the bottom of its square. Leave out `size`
// when the CSS class should decide the size.

export default function Avatar({ id, size, className = '' }) {
  const avatar = avatarOf(id);
  const aspect = avatar.box[0] / avatar.box[1];
  const wide = aspect > 1;

  return (
    <i
      className={`avatar ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <i
        className="avatar__crop"
        style={{
          width: wide ? '100%' : `${aspect * 100}%`,
          height: wide ? `${100 / aspect}%` : '100%',
          transform: avatar.flip ? 'scaleX(-1)' : undefined,
        }}
      >
        <img
          className="avatar__img"
          src={avatar.src}
          alt=""
          style={{
            left: `${avatar.img.l}%`,
            top: `${avatar.img.t}%`,
            width: `${avatar.img.w}%`,
            height: `${avatar.img.h}%`,
          }}
        />
      </i>
    </i>
  );
}

/* ---------- inside the game's SVG world ---------- */
// x = middle of the feet, y = feet, size = height of the square.

// facing: 'left' or 'right' (the avatar turns around).
// lean: a small tilt, in degrees, toward the walking direction.
export function SvgAvatar({ id, x, y, size, facing = 'right', lean = 0 }) {
  const avatar = avatarOf(id);
  const { width, height } = fit(avatar, size);

  // Figma shows every avatar facing right. Facing left mirrors it.
  const mirrored = Boolean(avatar.flip) !== (facing === 'left');

  return (
    <g transform={lean ? `rotate(${lean} ${x} ${y})` : undefined}>
      <svg x={x - width / 2} y={y - height} width={width} height={height}>
        <image
          href={avatar.src}
          x={(avatar.img.l / 100) * width}
          y={(avatar.img.t / 100) * height}
          width={(avatar.img.w / 100) * width}
          height={(avatar.img.h / 100) * height}
          preserveAspectRatio="none"
          transform={mirrored ? `translate(${width} 0) scale(-1 1)` : undefined}
        />
      </svg>
    </g>
  );
}