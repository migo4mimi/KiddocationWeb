import { CATEGORIES, categoryLabel } from './progress.js';

export function getLearningVideo(grade, category, baseUrl = '/') {
  const level = Math.min(Math.max(Math.round(Number(grade)) || 1, 1), 6);
  const categoryExists =
    CATEGORIES.some((item) => item.id === category && item.minGrade <= level) ||
    (category === 'counting' && level === 1);

  if (!categoryExists) return null;

  return {
    title: `Grade ${level} ${
      category === 'counting' ? 'Numbers & Counting' : categoryLabel(category)
    }`,
    fileName: `Grade ${level}.mp4`,
    src: `${baseUrl}videos/Grade%20${level}.mp4`,
  };
}
