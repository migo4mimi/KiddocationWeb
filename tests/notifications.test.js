import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { notify, sendTestNotification } from '../src/lib/feedback.js';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalLocalStorage = globalThis.localStorage;
const shownNotifications = [];

class MockNotification {
  static permission = 'granted';

  constructor(title, options) {
    shownNotifications.push({ title, options });
  }
}

function setup({ enabled = true, hidden = true } = {}) {
  shownNotifications.length = 0;
  MockNotification.permission = 'granted';
  globalThis.window = { Notification: MockNotification };
  globalThis.document = {
    hidden,
    visibilityState: hidden ? 'hidden' : 'visible',
  };
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ notifications: enabled }),
  };
}

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;

  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;

  if (originalLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalLocalStorage;
});

test('match notification appears only when enabled and the page is hidden', () => {
  setup();
  assert.equal(notify('Kiddocation', 'Your game is starting!'), true);
  assert.equal(shownNotifications.length, 1);

  setup({ hidden: false });
  assert.equal(notify('Kiddocation', 'Your game is starting!'), false);
  assert.equal(shownNotifications.length, 0);

  setup({ enabled: false });
  assert.equal(notify('Kiddocation', 'Your game is starting!'), false);
  assert.equal(shownNotifications.length, 0);
});

test('test notification can be sent while the Settings page is visible', () => {
  setup({ hidden: false });
  assert.equal(sendTestNotification(), 'sent');
  assert.equal(shownNotifications.length, 1);
});
