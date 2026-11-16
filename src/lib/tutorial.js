import { CATEGORIES } from './progress.js';

const SEEN_KEY = 'kiddocation-tutorial-seen';
const seenThisSession = new Set();

function accountKey(userId) {
  return `${SEEN_KEY}:${userId || 'guest'}`;
}

function categoryKey(userId, category) {
  return `${SEEN_KEY}:${userId || 'guest'}:${category}`;
}

export function hasSeenTutorial(
  userId,
  category,
  accountCategories = [],
  legacyAccountSeen = false
) {
  if (!category) return false;

  const key = accountKey(userId);
  if (
    seenThisSession.has(key)
    || accountCategories.length > 0
    || legacyAccountSeen
  ) {
    markTutorialSeen(userId, category);
    return true;
  }

  try {
    if (localStorage.getItem(key) === '1') return true;

    const hasCategoryFlag = CATEGORIES.some(
      (item) => localStorage.getItem(categoryKey(userId, item.id)) === '1'
    );
    if (hasCategoryFlag) {
      markTutorialSeen(userId, category);
      return true;
    }
  } catch {
    return seenThisSession.has(key) || legacyAccountSeen || accountCategories.length > 0;
  }

  return false;
}

export function markTutorialSeen(userId, category) {
  const key = accountKey(userId);
  seenThisSession.add(key);

  try {
    localStorage.setItem(key, '1');
    if (category) localStorage.setItem(categoryKey(userId, category), '1');
  } catch {
    // Account metadata is the persistent fallback when browser storage is unavailable.
  }
}
