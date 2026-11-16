import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSeenTutorial, markTutorialSeen } from '../src/lib/tutorial.js';

function createStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test('tutorial completion is persistent once per account', () => {
  globalThis.localStorage = createStorage();

  markTutorialSeen('player-42', 'addition');

  assert.equal(hasSeenTutorial('player-42', 'addition'), true);
  assert.equal(hasSeenTutorial('player-42', 'subtraction'), true);
  assert.equal(hasSeenTutorial('player-99', 'addition'), false);
  assert.equal(hasSeenTutorial('player-42', 'mixed'), true);
});

test('a legacy tutorial flag migrates to account-wide completion', () => {
  const storage = createStorage();
  globalThis.localStorage = storage;
  storage.setItem('kiddocation-tutorial-seen:player-73', '1');

  assert.equal(hasSeenTutorial('player-73', 'addition'), true);
  assert.equal(hasSeenTutorial('player-73', 'subtraction'), true);
  assert.equal(hasSeenTutorial('player-74', 'addition'), false);
  storage.setItem('kiddocation-tutorial-seen', '1');
  assert.equal(hasSeenTutorial('player-75', 'addition'), false);
});

test('a previous category completion suppresses tutorials for all categories', () => {
  const storage = createStorage();
  globalThis.localStorage = storage;
  storage.setItem('kiddocation-tutorial-seen:player-81:subtraction', '1');

  assert.equal(hasSeenTutorial('player-81', 'addition'), true);
  assert.equal(hasSeenTutorial('player-82', 'addition'), false);
});
