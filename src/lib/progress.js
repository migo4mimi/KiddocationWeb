/* =========================================================
   LEVELS, CATEGORIES AND RANKS
   The same rules are used by the database (multiplayer-2.sql).
========================================================= */

// Level n -> n + 1 needs 100 + 50 x (n - 1) XP.
// Everyone starts at 0 XP, which is Level 1.
export function levelInfo(xp = 0) {
  let level = 1;
  let need = 100;
  let rest = Math.max(0, Math.floor(Number(xp) || 0));

  while (rest >= need) {
    rest -= need;
    level += 1;
    need += 50;
  }

  return {
    level,
    into: rest,
    need,
    percent: Math.round((rest / need) * 100),
  };
}

// minGrade: the first grade that can play this category.
export const CATEGORIES = [
  { id: 'addition', label: 'Addition', symbol: '+', minGrade: 1 },
  { id: 'subtraction', label: 'Subtraction', symbol: '−', minGrade: 1 },
  { id: 'multiplication', label: 'Multiplication', symbol: '×', minGrade: 2 },
  { id: 'division', label: 'Division', symbol: '÷', minGrade: 3 },
  { id: 'mixed', label: 'Mixed', symbol: '+ − × ÷', minGrade: 1 },
];

export const ROUND_CHOICES = [3, 5, 10];

export function pointsPerCorrect() {
  return 10;
}

export function categoryLabel(id) {
  return CATEGORIES.find((category) => category.id === id)?.label || 'Addition';
}

const TIERS = [
  { name: 'BRONZE', from: 0 },
  { name: 'SILVER', from: 100 },
  { name: 'GOLD', from: 300 },
  { name: 'PLATINUM', from: 600 },
  { name: 'DIAMOND', from: 1000 },
];

export function rankTier(rankPoints = 0) {
  let tier = TIERS[0];

  TIERS.forEach((item) => {
    if (rankPoints >= item.from) tier = item;
  });

  return tier.name;
}

const LEVEL_RANKS = [
  { name: 'BRONZE', color: '#b97848' },
  { name: 'SILVER', color: '#8497a7' },
  { name: 'GOLD', color: '#d89c27' },
  { name: 'PLATINUM', color: '#3eaaa0' },
  { name: 'DIAMOND', color: '#478be0' },
  { name: 'ASCENDANT', color: '#47a56d' },
  { name: 'IMMORTAL', color: '#b74762' },
  { name: 'RADIANT', color: '#e5b930' },
];

export function rankForLevel(level = 1) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const tierIndex = Math.min(LEVEL_RANKS.length - 1, Math.floor((safeLevel - 1) / 3));
  const tier = LEVEL_RANKS[tierIndex];
  const division = tierIndex === LEVEL_RANKS.length - 1
    ? safeLevel - tierIndex * 3
    : ((safeLevel - 1) % 3) + 1;

  return {
    ...tier,
    division,
    label: `${tier.name} ${division}`,
  };
}