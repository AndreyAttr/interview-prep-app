export interface Category {
  id: string;
  name: string;
  parentId: string | null; // null = root node; hierarchy built client-side from this flat list
  special?: boolean; // true for Starred — not draggable, not deletable
  settings?: CategorySettings;
}

export type QuestionSource = 'ai' | 'db' | 'manual' | 'mix';

export interface CategorySettings {
  questionsPerTest: number;
  questionSource: QuestionSource;
  sourceWeights?: {
    // present only when questionSource === 'mix'; %, sums to 100
    ai: number;
    db: number;
    manual: number;
  };
  difficultyMix: {
    easy: number; // %, sums to 100
    medium: number;
    hard: number;
  };
}
