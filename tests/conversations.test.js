import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentConversation } from '../src/lib/conversations.js';

test('ignores a conversation response after switching to another friend', () => {
  assert.equal(isCurrentConversation('friend-a', 'friend-b'), false);
  assert.equal(isCurrentConversation('friend-b', 'friend-b'), true);
  assert.equal(isCurrentConversation('friend-b', null), false);
});
