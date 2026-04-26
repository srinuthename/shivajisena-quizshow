export interface QuestionShuffleMap {
  shuffledOptions: string[];
  shuffledIndices: number[];
  labels: string[];
  labelToOriginalIndex: Record<string, number>;
  correctLabel: string;
}

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function pickRandomLabels(count: number): string[] {
  const pool = ALL_LETTERS.split('');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateShuffleMap(options: string[], correctAnswer: number): QuestionShuffleMap {
  const n = options.length;
  const shuffledIndices = shuffleIndices(n);
  const labels = pickRandomLabels(n);
  const shuffledOptions = shuffledIndices.map((i) => options[i]);
  const labelToOriginalIndex: Record<string, number> = {};
  for (let pos = 0; pos < n; pos++) {
    labelToOriginalIndex[labels[pos]] = shuffledIndices[pos];
  }
  const correctDisplayPos = shuffledIndices.indexOf(correctAnswer);
  const correctLabel = labels[correctDisplayPos];
  return { shuffledOptions, shuffledIndices, labels, labelToOriginalIndex, correctLabel };
}
