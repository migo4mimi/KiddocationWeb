import assert from 'node:assert/strict';
import test from 'node:test';
import { avatarForPlayer } from '../src/lib/playerAvatar.js';

test('uses the current profile avatar for the local player', () => {
  assert.equal(
    avatarForPlayer({ user_id: 'player-1', avatar_id: 'default' }, 'player-1', 'striker'),
    'striker'
  );
});

test('keeps other players avatars and falls back to the room avatar', () => {
  assert.equal(
    avatarForPlayer({ user_id: 'player-2', avatar_id: 'adventurer' }, 'player-1', 'striker'),
    'adventurer'
  );
  assert.equal(
    avatarForPlayer({ user_id: 'player-1', avatar_id: 'default' }, 'player-1', null),
    'default'
  );
});
