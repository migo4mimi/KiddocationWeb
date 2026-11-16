import assert from 'node:assert/strict';
import test from 'node:test';
import { pointsPerCorrect, rankForLevel } from '../src/lib/progress.js';
import { localCalendarDate, nextStreak } from '../src/lib/streak.js';

test('daily streak increments only on consecutive local calendar days', () => {
  assert.equal(nextStreak(null, 0, '2026-11-09'), 1);
  assert.equal(nextStreak('2026-11-09', 1, '2026-11-09'), 1);
  assert.equal(nextStreak('2026-11-09', 1, '2026-11-10'), 2);
  assert.equal(nextStreak('2026-11-09', 4, '2026-11-11'), 1);
});

test('rank divisions and tiers advance with level', () => {
  assert.equal(rankForLevel(1).label, 'BRONZE 1');
  assert.equal(rankForLevel(2).label, 'BRONZE 2');
  assert.equal(rankForLevel(3).label, 'BRONZE 3');
  assert.equal(rankForLevel(4).label, 'SILVER 1');
  assert.equal(rankForLevel(22).label, 'RADIANT 1');
  assert.equal(rankForLevel(23).label, 'RADIANT 2');
});

test('all grades earn 10 points for each correct answer', () => {
  assert.equal(pointsPerCorrect(), 10);
});

test('activity date follows the player local calendar day', () => {
  const date = new Date(2026, 10, 11, 23, 45);
  assert.equal(localCalendarDate(date), '2026-11-11');
});
