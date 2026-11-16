import assert from 'node:assert/strict';
import test from 'node:test';
import { getLearningVideo } from '../src/lib/learningVideos.js';
import { getPracticePacketSelection } from '../src/lib/lessons.js';

test('learning videos resolve to a local MP4 for each supported grade and category', () => {
  assert.deepEqual(getLearningVideo(1, 'addition'), {
    title: 'Grade 1 Addition',
    fileName: 'Grade 1.mp4',
    src: '/videos/Grade%201.mp4',
  });
  assert.deepEqual(getLearningVideo(2, 'multiplication'), {
    title: 'Grade 2 Multiplication',
    fileName: 'Grade 2.mp4',
    src: '/videos/Grade%202.mp4',
  });
  assert.deepEqual(getLearningVideo(6, 'mixed'), {
    title: 'Grade 6 Mixed',
    fileName: 'Grade 6.mp4',
    src: '/videos/Grade%206.mp4',
  });
  assert.deepEqual(getLearningVideo(1, 'counting'), {
    title: 'Grade 1 Numbers & Counting',
    fileName: 'Grade 1.mp4',
    src: '/videos/Grade%201.mp4',
  });
  assert.equal(
    getLearningVideo(2, 'multiplication', '/KiddocationWeb/').src,
    '/KiddocationWeb/videos/Grade%202.mp4'
  );
});

test('learning video paths reject categories that are not available in the grade', () => {
  assert.equal(getLearningVideo(1, 'division'), null);
  assert.equal(getLearningVideo(7, 'unknown'), null);
});

test('practice learning packets follow the chosen grade and category', () => {
  assert.deepEqual(getPracticePacketSelection(3, 'subtraction'), {
    grade: 3,
    category: 'subtraction',
  });
  assert.deepEqual(getPracticePacketSelection(1, 'mixed'), {
    grade: 1,
    category: 'mixed',
  });
  assert.deepEqual(getPracticePacketSelection(5, 'unknown'), {
    grade: 5,
    category: 'addition',
  });
});
