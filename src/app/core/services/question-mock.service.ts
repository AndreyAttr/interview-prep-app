import { Injectable, signal } from '@angular/core';

import { Question } from '../models/question.model';

let nextQuestionId = 1;

const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Explain the difference between IEnumerable and IQueryable in .NET.',
    answerType: 'text',
    categoryIds: ['dotnet'],
    categoryLabel: '.NET',
    difficulty: 'medium',
    source: 'db',
  },
  {
    id: 'q2',
    text: 'Which EF Core method loads related entities in the same query?',
    answerType: 'radio',
    options: [
      { id: 'o1', label: 'Include', isCorrect: true },
      { id: 'o2', label: 'Select', isCorrect: false },
      { id: 'o3', label: 'Where', isCorrect: false },
    ],
    categoryIds: ['ef'],
    categoryLabel: 'EF',
    difficulty: 'easy',
    source: 'db',
  },
  {
    id: 'q3',
    text: 'Which of the following are Claude model names?',
    answerType: 'checkbox',
    options: [
      { id: 'o1', label: 'Sonnet', isCorrect: true },
      { id: 'o2', label: 'Opus', isCorrect: true },
      { id: 'o3', label: 'Gemini', isCorrect: false },
    ],
    categoryIds: ['ai', 'claude', 'starred'],
    categoryLabel: 'Claude',
    difficulty: 'hard',
    source: 'ai',
  },
];

/**
 * In-memory mock for question data (section2-cc.md §Stubs). Same method
 * shape as a future HTTP-backed QuestionService so this can be swapped
 * without touching consumers. Mutating methods keep state in a signal so
 * Star toggling is visible without a page reload.
 */
@Injectable({ providedIn: 'root' })
export class QuestionMockService {
  private readonly state = signal<Question[]>(MOCK_QUESTIONS);

  readonly questions = this.state.asReadonly();

  addQuestion(question: Omit<Question, 'id'>): Question {
    const newQuestion: Question = { ...question, id: `manual-${nextQuestionId++}` };
    this.state.update((questions) => [...questions, newQuestion]);
    return newQuestion;
  }

  toggleCategoryMembership(questionId: string, categoryId: string): void {
    this.state.update((questions) =>
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const has = q.categoryIds.includes(categoryId);
        return {
          ...q,
          categoryIds: has ? q.categoryIds.filter((id) => id !== categoryId) : [...q.categoryIds, categoryId],
        };
      }),
    );
  }
}
