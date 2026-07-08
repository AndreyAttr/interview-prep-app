export type AnswerType = 'text' | 'checkbox' | 'radio';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  answerType: AnswerType;
  options?: QuestionOption[]; // for checkbox/radio
  categoryIds: string[]; // M2M — "starred" status is derived as categoryIds.includes('starred')
  categoryLabel: string; // display label for the question card's category badge
  difficulty: Difficulty;
  images?: string[];
  source: 'ai' | 'db' | 'manual';
}
