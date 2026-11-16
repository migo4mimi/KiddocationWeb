import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import {
  AVATARS,
  AVATAR_ORDER,
  buyAvatar,
  equipAvatar,
  fetchStore,
} from '../lib/avatars';
import './AvatarStore.css';

// The avatar store. Home shows its header (name, level, PTS) above this.
export default function AvatarStore({ profile, onRefreshProfile }) {
  // Prices come from the server; these are only the backup.
  const [items, setItems] = useState(
    AVATAR_ORDER.map((id) => ({ id, name: AVATARS[id].name, price: AVATARS[id].price }))
  );
  const equipped = profile?.avatar_id || 'default';
  const owned = profile?.owned_avatars || ['default'];
  const points = profile?.points || 0;

  const [selected, setSelected] = useState(equipped);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;

    fetchStore()
      .then((list) => {
        if (alive && list.length > 0) setItems(list);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const item = items.find((entry) => entry.id === selected) || items[0];
  const isOwned = owned.includes(item.id);
  const isEquipped = equipped === item.id;
  const missing = Math.max(0, item.price - points);

  async function handleAction() {
    setBusy(true);
    setMessage('');

    try {
      if (!isOwned) {
        await buyAvatar(item.id);
        await equipAvatar(item.id);
        setMessage(`You bought ${item.name}!`);
      } else {
        await equipAvatar(item.id);
        setMessage(`${item.name} is now your avatar.`);
      }

      await onRefreshProfile?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  let label = 'USE THIS AVATAR';
  if (isEquipped) label = 'YOUR AVATAR';
  else if (!isOwned && missing > 0) label = `NEED ${missing} MORE`;
  else if (!isOwned) label = `BUY · ${item.price} PTS`;

  let status = 'Owned';
  if (isEquipped) status = 'Wearing now';
  else if (!isOwned) status = `${item.price} PTS`;

  return (
    <section className="store" aria-label="Avatar store">
      <div className="store-preview">
        <Avatar id={item.id} size={170} />
      </div>

      <div className="store-info">
        <div className="store-info__text">
          <strong>{item.name}</strong>
          <span>{status}</span>
        </div>

        <button
          type="button"
          className="store-action"
          onClick={handleAction}
          disabled={busy || isEquipped || (!isOwned && missing > 0)}
        >
          {label}
        </button>
      </div>

      <p className="store-message" role="status">
        {message || (isOwned ? ' ' : 'Earn points by answering correctly in games.')}
      </p>

      <div className="store-grid">
      {items.map((entry, index) => {
  const has = owned.includes(entry.id);

  const avatarName = entry.name.trim().toLowerCase();

  const rarity =
    avatarName === 'screaming cat'
      ? 'legendary'
      : avatarName === 'detective'
        ? 'epic'
        : undefined;

  return (
<button
  key={entry.id}
  type="button"
  data-rarity={rarity}
  className={`store-cell store-cell--${index % 2 === 0 ? 'light' : 'dark'} ${
    selected === entry.id ? 'is-selected' : ''
  } ${has ? '' : 'is-locked'}`}
  onClick={() => {
    setSelected(entry.id);
    setMessage('');
  }}
  aria-pressed={selected === entry.id}
  aria-label={`${entry.name}, ${has ? 'owned' : `${entry.price} points`}`}
>
              <Avatar id={entry.id} />

              {equipped === entry.id && <span className="store-cell__badge">ON</span>}
              {!has && <span className="store-cell__price">🔒 {entry.price}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}