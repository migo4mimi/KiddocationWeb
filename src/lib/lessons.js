import { CATEGORIES, categoryLabel } from './progress.js';

/* =========================================================
   THE LEARNING PACKET
   One lesson for every grade and category the game can ask.
   The numbers match what the game uses at that grade.
   example: a, op, b and answer are real arithmetic (checked by a test).
========================================================= */

const LEVELS = ['BEGINNER', 'BEGINNER', 'EXPLORER', 'EXPLORER', 'ADVANCED', 'ADVANCED'];

const LESSONS = {
  /* ---------------- ADDITION ---------------- */
  '1-addition': {
    intro: 'Adding means putting groups together to find how many there are in all.',
    visual: { type: 'add', a: 3, b: 2 },
    steps: [
      'Look at the first group and count it.',
      'Count on the second group, one by one.',
      'The last number you say is the total!',
    ],
    example: { a: 4, op: '+', b: 3, answer: 7, note: 'Start at 4 and count on 3 more: 5, 6, 7.' },
    tips: [
      { bold: 'Zero', text: 'added to any number changes nothing. 5 + 0 = 5.' },
      { bold: 'Order', text: 'does not matter. 3 + 4 and 4 + 3 are both 7.' },
    ],
    challenge: 'Find 5 pencils and 3 erasers. How many things do you have in all?',
  },
  '2-addition': {
    intro: 'Now the totals can go up to 20. Two tricks make it quick: make 10, and use doubles.',
    visual: { type: 'add', a: 8, b: 5 },
    steps: [
      'Take the bigger number first.',
      'Add the small part that makes it a full 10.',
      'Add what is left over.',
    ],
    example: { a: 8, op: '+', b: 5, answer: 13, note: '8 + 2 = 10, and 3 more is 13.' },
    tips: [
      { bold: 'Doubles', text: 'are easy to remember. 6 + 6 = 12 and 7 + 7 = 14.' },
      { bold: 'Make 10', text: 'first: 9 + 4 is 9 + 1 = 10, then 3 more.' },
    ],
    challenge: 'Think of two numbers that add up to exactly 10. Can you find 5 pairs?',
  },
  '3-addition': {
    intro: 'Bigger numbers are easy when you split them into tens and ones.',
    visual: null,
    steps: [
      'Split each number into tens and ones.',
      'Add the tens together, then the ones together.',
      'Put the two answers together.',
    ],
    example: { a: 27, op: '+', b: 15, answer: 42, note: '20 + 10 = 30, 7 + 5 = 12, and 30 + 12 = 42.' },
    tips: [
      { bold: 'Count on', text: 'by tens: 27 + 10 is 37, 47... then fix the ones.' },
      { bold: 'Estimate', text: 'first. 27 + 15 is a little more than 40.' },
    ],
    challenge: 'Add your age to your classmate\'s house number. Say the tens first!',
  },
  '4-addition': {
    intro: 'When the ones add up to 10 or more, we carry (regroup) to the tens.',
    visual: null,
    steps: [
      'Add the ones. If you get 10 or more, write the ones digit and carry 1.',
      'Add the tens and the carried 1.',
      'Read the whole answer.',
    ],
    example: { a: 48, op: '+', b: 37, answer: 85, note: 'Ones: 8 + 7 = 15, write 5 and carry 1. Tens: 4 + 3 + 1 = 8.' },
    tips: [
      { bold: 'Carry', text: 'means "move 10 ones to the tens place as 1 ten".' },
      { bold: 'Check', text: 'by adding in the other order. 37 + 48 should match.' },
    ],
    challenge: 'Add 59 + 26 on paper. How many times did you carry?',
  },
  '5-addition': {
    intro: 'Three-digit numbers: line up the digits, then add column by column.',
    visual: null,
    steps: [
      'Write the numbers so ones are under ones, tens under tens, hundreds under hundreds.',
      'Add from the right: ones, tens, then hundreds.',
      'Carry whenever a column is 10 or more.',
    ],
    example: { a: 186, op: '+', b: 247, answer: 433, note: '6 + 7 = 13 (carry 1), 8 + 4 + 1 = 13 (carry 1), 1 + 2 + 1 = 4.' },
    tips: [
      { bold: 'Neat columns', text: 'stop most mistakes. Use squared paper if you can.' },
      { bold: 'Round to check', text: '190 + 250 is about 440, close to 433.' },
    ],
    challenge: 'Add 358 + 275. Predict first: will it be more than 600?',
  },
  '6-addition': {
    intro: 'Totals up to 1000. Estimate first, then work it out exactly.',
    visual: null,
    steps: [
      'Round both numbers to estimate the answer.',
      'Add column by column from the right, carrying when needed.',
      'Compare with your estimate. Are they close?',
    ],
    example: { a: 478, op: '+', b: 356, answer: 834, note: 'Estimate: 480 + 360 = 840. Exact: 8 + 6 = 14, 7 + 5 + 1 = 13, 4 + 3 + 1 = 8.' },
    tips: [
      { bold: 'Estimate', text: 'tells you if your answer makes sense.' },
      { bold: 'Compensate', text: 'by adding 500 and taking 22 away for 478 + 356.' },
    ],
    challenge: 'Find two numbers under 600 that add up to exactly 1000.',
  },

  /* ---------------- SUBTRACTION ---------------- */
  '1-subtraction': {
    intro: 'Subtracting means taking some away to find how many are left.',
    visual: { type: 'sub', a: 5, b: 2 },
    steps: [
      'Start with the bigger number.',
      'Count back the small number, one by one.',
      'The number you land on is the answer.',
    ],
    example: { a: 8, op: '−', b: 3, answer: 5, note: 'Start at 8 and count back 3: 7, 6, 5.' },
    tips: [
      { bold: 'Same number', text: 'taken away gives zero. 4 − 4 = 0.' },
      { bold: 'Take away zero', text: 'and nothing changes. 6 − 0 = 6.' },
    ],
    challenge: 'You have 9 stickers and give 4 to a friend. How many are left?',
  },
  '2-subtraction': {
    intro: 'Numbers up to 20. Count back, or think: "what do I add to get there?"',
    visual: { type: 'sub', a: 12, b: 5 },
    steps: [
      'Look at the small number you take away.',
      'Count back from the big number, or count up from the small one.',
      'Check with addition.',
    ],
    example: { a: 15, op: '−', b: 7, answer: 8, note: '7 + 8 = 15, so 15 − 7 = 8.' },
    tips: [
      { bold: 'Addition and subtraction', text: 'are partners. 7 + 8 = 15 means 15 − 7 = 8.' },
      { bold: 'Through 10', text: 'is easy: 14 − 6 is 14 − 4 = 10, then 2 more.' },
    ],
    challenge: 'Start at 20 and count back by 2s. Where do you stop?',
  },
  '3-subtraction': {
    intro: 'Subtract tens first, then ones. Taking it in small steps makes it easy.',
    visual: null,
    steps: [
      'Take away the tens of the small number.',
      'Then take away the ones.',
      'Check by adding the answer to the small number.',
    ],
    example: { a: 46, op: '−', b: 18, answer: 28, note: '46 − 10 = 36, then 36 − 8 = 28. Check: 28 + 18 = 46.' },
    tips: [
      { bold: 'Count back', text: 'in tens: 46, 36, 26... then fix the ones.' },
      { bold: 'Check', text: 'every answer by adding it back.' },
    ],
    challenge: 'You have 50 marbles and lose 23. How many do you have?',
  },
  '4-subtraction': {
    intro: 'When the top ones digit is smaller, we borrow (regroup) 1 ten.',
    visual: null,
    steps: [
      'Look at the ones. Is the top digit smaller?',
      'If yes, borrow 1 ten. Turn it into 10 ones.',
      'Subtract the ones, then the tens.',
    ],
    example: { a: 72, op: '−', b: 38, answer: 34, note: '2 is smaller than 8, so borrow: 12 − 8 = 4. Tens: 6 − 3 = 3.' },
    tips: [
      { bold: 'Borrow', text: 'means "break 1 ten into 10 ones".' },
      { bold: 'Check', text: '34 + 38 should give 72.' },
    ],
    challenge: 'Solve 91 − 45. Did you need to borrow?',
  },
  '5-subtraction': {
    intro: 'Three-digit numbers. Work from the right and borrow when you need to.',
    visual: null,
    steps: [
      'Line up the digits in columns.',
      'Subtract ones, then tens, then hundreds.',
      'Borrow from the next column when the top digit is too small.',
    ],
    example: { a: 412, op: '−', b: 189, answer: 223, note: '12 − 9 = 3, then 0 − 8 needs a borrow: 10 − 8 = 2, and 3 − 1 = 2.' },
    tips: [
      { bold: 'Estimate', text: '410 − 190 is about 220, close to 223.' },
      { bold: 'Add back', text: '223 + 189 = 412.' },
    ],
    challenge: 'A bus holds 500 people and 267 get on. How many seats are left?',
  },
  '6-subtraction': {
    intro: 'Numbers up to 1000, even with zeros in the middle. Stay calm and borrow step by step.',
    visual: null,
    steps: [
      'Estimate the answer by rounding.',
      'Borrow across zeros one place at a time.',
      'Check by adding your answer to the small number.',
    ],
    example: { a: 903, op: '−', b: 467, answer: 436, note: 'Borrow 1 hundred, then 1 ten. Check: 436 + 467 = 903.' },
    tips: [
      { bold: 'Zeros', text: 'cannot lend. Borrow from the next digit that can.' },
      { bold: 'Always check', text: 'by adding. It takes 10 seconds.' },
    ],
    challenge: 'Take 999 and subtract any 3-digit number. What do you notice?',
  },

  /* ---------------- MULTIPLICATION ---------------- */
  '2-multiplication': {
    intro: 'Multiplying is adding the same number again and again. 3 × 4 means 3 groups of 4.',
    visual: { type: 'mul', rows: 3, cols: 4 },
    steps: [
      'Read it as "groups of": 3 × 4 is 3 groups of 4.',
      'Skip count by the group size: 4, 8, 12.',
      'The last number is the answer.',
    ],
    example: { a: 3, op: '×', b: 4, answer: 12, note: '4 + 4 + 4 = 12. Three groups of four.' },
    tips: [
      { bold: 'Times 1', text: 'keeps the number the same. 5 × 1 = 5.' },
      { bold: 'Flip it', text: '2 × 5 and 5 × 2 are both 10.' },
    ],
    challenge: 'There are 4 tables with 5 chairs each. Count the chairs by 5s.',
  },
  '3-multiplication': {
    intro: 'Learn the times tables up to 10 × 10. Start with the easy ones!',
    visual: { type: 'mul', rows: 4, cols: 6 },
    steps: [
      'Know the easy tables first: 1s, 2s, 5s, and 10s.',
      'Build the others from them. 6 × 4 is double 6 × 2.',
      'Say the table out loud a few times.',
    ],
    example: { a: 7, op: '×', b: 6, answer: 42, note: '7 × 5 = 35, and one more 7 makes 42.' },
    tips: [
      { bold: 'Fives', text: 'always end in 0 or 5.' },
      { bold: 'Nines', text: 'trick: 9 × 4 is 40 − 4 = 36.' },
    ],
    challenge: 'Race a friend: say the 6 times table up to 6 × 10!',
  },
  '4-multiplication': {
    intro: 'Tables up to 12 × 12. Break the big one into two easy ones.',
    visual: null,
    steps: [
      'Split the larger number into 10 and the rest.',
      'Multiply each part.',
      'Add the two answers.',
    ],
    example: { a: 12, op: '×', b: 8, answer: 96, note: '10 × 8 = 80, 2 × 8 = 16, and 80 + 16 = 96.' },
    tips: [
      { bold: 'Split', text: '11 × 7 is 10 × 7 plus one more 7.' },
      { bold: 'Even times anything', text: 'gives an even number.' },
    ],
    challenge: 'A box holds 12 eggs. How many eggs are in 9 boxes?',
  },
  '5-multiplication': {
    intro: 'A two-digit number times a one-digit number. Split it into tens and ones.',
    visual: null,
    steps: [
      'Split the big number: 47 is 40 and 7.',
      'Multiply each part by the small number.',
      'Add the two answers.',
    ],
    example: { a: 47, op: '×', b: 6, answer: 282, note: '40 × 6 = 240, 7 × 6 = 42, and 240 + 42 = 282.' },
    tips: [
      { bold: 'Estimate', text: '50 × 6 = 300, so 282 makes sense.' },
      { bold: 'Place value', text: 'is the secret. Tens times a number stay tens.' },
    ],
    challenge: 'A pack has 36 stickers. How many in 5 packs?',
  },
  '6-multiplication': {
    intro: 'Two-digit times two-digit. Multiply by the tens and the ones, then add.',
    visual: null,
    steps: [
      'Split the second number: 14 is 10 and 4.',
      'Multiply the first number by each part.',
      'Add the two answers.',
    ],
    example: { a: 23, op: '×', b: 14, answer: 322, note: '23 × 10 = 230, 23 × 4 = 92, and 230 + 92 = 322.' },
    tips: [
      { bold: 'Times 10', text: 'just adds a zero to the end.' },
      { bold: 'Estimate', text: '20 × 15 = 300, close to 322.' },
    ],
    challenge: 'There are 18 rows with 25 seats each. How many seats in all?',
  },

  /* ---------------- DIVISION ---------------- */
  '3-division': {
    intro: 'Dividing means sharing equally. 12 ÷ 3 asks: how many in each group if we make 3 groups?',
    visual: { type: 'div', total: 12, groups: 3 },
    steps: [
      'Read it as "share equally".',
      'Think of the times table: 3 × ? = 12.',
      'The missing number is the answer.',
    ],
    example: { a: 12, op: '÷', b: 3, answer: 4, note: '3 × 4 = 12, so 12 ÷ 3 = 4.' },
    tips: [
      { bold: 'Division', text: 'is multiplication backwards.' },
      { bold: 'Divide by 1', text: 'and the number stays the same.' },
    ],
    challenge: 'Share 20 sweets equally between 5 children. How many each?',
  },
  '4-division': {
    intro: 'Use your times tables to divide quickly. Every fact has a partner.',
    visual: { type: 'div', total: 24, groups: 4 },
    steps: [
      'Find the fact family: 8 × 9 = 72.',
      'Turn it around: 72 ÷ 8 = 9 and 72 ÷ 9 = 8.',
      'Check by multiplying your answer.',
    ],
    example: { a: 72, op: '÷', b: 8, answer: 9, note: '8 × 9 = 72, so 72 ÷ 8 = 9.' },
    tips: [
      { bold: 'Fact family', text: '3 numbers, 4 facts: two × and two ÷.' },
      { bold: 'Check', text: 'answer × divisor must equal the start.' },
    ],
    challenge: 'Make up a fact family using 6, 7 and 42.',
  },
  '5-division': {
    intro: 'Bigger division. Think "how many times does it fit?" and use tables you know.',
    visual: null,
    steps: [
      'Ask: what times the divisor gets close to the number?',
      'Use the tables you know, like 12 × 10 = 120.',
      'Fill the gap, then add the parts.',
    ],
    example: { a: 156, op: '÷', b: 12, answer: 13, note: '12 × 10 = 120, and 12 × 3 = 36. 120 + 36 = 156, so the answer is 13.' },
    tips: [
      { bold: 'Chunking', text: 'means taking away big groups first.' },
      { bold: 'Check', text: '13 × 12 = 156.' },
    ],
    challenge: 'A farmer packs 144 eggs into boxes of 12. How many boxes?',
  },
  '6-division': {
    intro: 'Divide bigger numbers by chunking: take out easy multiples, then count the chunks.',
    visual: null,
    steps: [
      'Take out a friendly chunk, like 10 times the divisor.',
      'Divide what is left over.',
      'Add the number of chunks together.',
    ],
    example: { a: 432, op: '÷', b: 12, answer: 36, note: '12 × 30 = 360. Left: 72, and 12 × 6 = 72. So 30 + 6 = 36.' },
    tips: [
      { bold: 'Friendly numbers', text: 'are 10 times, 5 times, and 2 times.' },
      { bold: 'Check', text: '36 × 12 = 432.' },
    ],
    challenge: '480 students go on trips in groups of 15. How many groups?',
  },
};

// Mixed practice: a short guide that matches the signs for that grade.
function mixedLesson(grade) {
  const signs = grade === 1 ? '+ and −' : grade === 2 ? '+, − and ×' : '+, −, × and ÷';

  return {
    intro: `Mixed practice uses ${signs} in the same game. Read the sign first, every time!`,
    visual: null,
    steps: [
      'Look at the sign between the two numbers.',
      'Switch your brain to that operation.',
      'Solve it, then walk to the right color.',
    ],
    example: { a: 6, op: '+', b: 4, answer: 10, note: 'The sign says add, so 6 + 4 = 10.' },
    tips: [
      { bold: 'The sign', text: 'tells you what to do. Never guess before you read it.' },
      { bold: 'Practice', text: 'each category on its own first, then try Mixed.' },
    ],
    challenge: 'Ask a friend to say any two numbers and a sign. Solve it out loud!',
  };
}

const COUNTING_LESSON = {
  intro: 'Numbers tell us how many things we have. Count each object once to find the total.',
  visual: { type: 'add', a: 2, b: 1 },
  steps: [
    'Point to one object at a time.',
    'Say the numbers in order as you count.',
    'The last number you say tells how many objects there are.',
  ],
  example: {
    a: 2,
    op: '+',
    b: 1,
    answer: 3,
    note: 'Two apples and one more apple make three apples.',
  },
  tips: [
    { bold: 'Zero', text: 'means none. If there are no cookies, there are 0 cookies.' },
    { bold: 'Count carefully', text: 'so you do not skip or count the same object twice.' },
  ],
  challenge: 'Count 10 things around you. Which number comes right after 10?',
};

export function getLesson(grade, category) {
  const level = Math.min(Math.max(Math.round(grade) || 1, 1), 6);
  const base =
    category === 'counting' && level === 1
      ? COUNTING_LESSON
      : category === 'mixed'
        ? mixedLesson(level)
        : LESSONS[`${level}-${category}`];

  if (!base) return null;

  return {
    ...base,
    level: LEVELS[level - 1],
    grade: level,
    category,
    title:
      category === 'counting'
        ? 'Grade 1 · Numbers & Counting'
        : `Grade ${level} · ${categoryLabel(category)}`,
  };
}

export function getPracticePacketSelection(grade, category) {
  const safeGrade = Math.min(Math.max(Math.round(Number(grade)) || 1, 1), 6);
  const categoryId = typeof category === 'string' ? category : 'addition';
  const selected = CATEGORIES.find((item) => item.id === categoryId);

  if (selected && selected.minGrade <= safeGrade) {
    return { grade: safeGrade, category: categoryId };
  }

  return {
    grade: safeGrade,
    category: safeGrade === 1 ? 'counting' : 'addition',
  };
}

// Used by the tests.
export { LESSONS };