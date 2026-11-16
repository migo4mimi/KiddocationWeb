export function getAutomaticAnswerSubmissionResult(round, correct, error) {
  if (error) {
    const reason = error.message || 'Please check your connection.';
    return {
      outcome: null,
      error: `Could not confirm your answer for round ${round + 1}. Your score may not include it. ${reason}`,
    };
  }

  return {
    outcome: correct ? 'correct' : 'wrong',
    error: '',
  };
}
