function dayNumber(date) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
}

export function nextStreak(lastPlayedOn, currentStreak, playedOn) {
  if (!lastPlayedOn) return 1;

  const difference = dayNumber(playedOn) - dayNumber(lastPlayedOn);
  if (difference <= 0) return Math.max(1, Number(currentStreak) || 1);
  if (difference === 1) return (Number(currentStreak) || 0) + 1;
  return 1;
}

export function localCalendarDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
