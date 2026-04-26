const MAX_VIEWER_SCORE = 1000;

export interface ViewerScoreInput {
  isCorrect: boolean;
  responseTimeMs: number;
  questionDurationMs: number;
  minimumScore: number;
}

export const calculateViewerScore = ({
  isCorrect,
  responseTimeMs,
  questionDurationMs,
  minimumScore,
}: ViewerScoreInput): number => {
  if (!isCorrect) return 0;

  const safeDuration = Math.max(1, Number(questionDurationMs) || 30000);
  const safeResponseTime = Math.max(0, Number(responseTimeMs) || 0);
  const safeMinimum = Math.max(0, Number(minimumScore) || 100);

  const calculatedScore = Math.floor(
    ((safeDuration - safeResponseTime) / safeDuration) * MAX_VIEWER_SCORE
  );

  return Math.max(safeMinimum, calculatedScore);
};
