export interface QuestionGradingResult {
  verdict: 'correct' | 'incorrect' | 'partial';
  explanation?: string; // present when verdict !== 'correct'
}

export interface TestSession {
  id: string;
  date: string;
  note: string;
  aiExpertise: string; // test-level summary shown in History
  score: number;
  questionIds: string[];
  answers: Record<string, string | string[]>;
  aiGrading?: Record<string, QuestionGradingResult>;
}
