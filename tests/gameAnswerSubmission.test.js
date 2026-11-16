import assert from 'node:assert/strict';
import test from 'node:test';
import { getAutomaticAnswerSubmissionResult } from '../src/lib/gameAnswerSubmission.js';

test('does not turn a failed automatic answer submission into a wrong answer', () => {
  const result = getAutomaticAnswerSubmissionResult(2, false, new Error('Network error'));

  assert.equal(result.outcome, null);
  assert.match(result.error, /round 3/i);
  assert.match(result.error, /score may not include it/i);
  assert.match(result.error, /Network error/i);
});

test('returns the confirmed correct or wrong result after a successful submission', () => {
  assert.deepEqual(getAutomaticAnswerSubmissionResult(0, true), {
    outcome: 'correct',
    error: '',
  });
  assert.deepEqual(getAutomaticAnswerSubmissionResult(0, false), {
    outcome: 'wrong',
    error: '',
  });
});
