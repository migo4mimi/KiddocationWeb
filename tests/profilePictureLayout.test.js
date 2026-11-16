import assert from 'node:assert/strict';
import test from 'node:test';
import { getProfilePictureLayout } from '../src/lib/profilePictureLayout.js';

const readyImage = {
  src: 'profile-photo',
  measuredSrc: 'profile-photo',
  viewportWidth: 100,
  viewportHeight: 100,
  naturalWidth: 400,
  naturalHeight: 200,
  zoom: 150,
  offsetX: 0.25,
  offsetY: 0,
};

test('keeps a refreshed photo hidden until it can render at its final crop', () => {
  const beforeImageLoads = getProfilePictureLayout({
    ...readyImage,
    measuredSrc: '',
    naturalWidth: 0,
    naturalHeight: 0,
  });
  const beforeCircleMeasures = getProfilePictureLayout({
    ...readyImage,
    viewportWidth: 0,
    viewportHeight: 0,
  });
  const ready = getProfilePictureLayout(readyImage);

  assert.equal(beforeImageLoads.visible, false);
  assert.equal(beforeCircleMeasures.visible, false);
  assert.equal(ready.visible, true);
  assert.equal(ready.width, 300);
  assert.equal(ready.height, 150);
  assert.equal(ready.offsetX, 25);
  assert.equal(ready.offsetY, 0);
});

test('clamps a saved crop to the image boundary', () => {
  const layout = getProfilePictureLayout({
    ...readyImage,
    offsetX: 10,
    offsetY: -10,
  });

  assert.equal(layout.offsetX, layout.maxOffsetX);
  assert.equal(layout.offsetY, -layout.maxOffsetY);
});
