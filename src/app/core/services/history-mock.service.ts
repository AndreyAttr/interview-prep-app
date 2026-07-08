import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { TestSession } from '../models/test-session.model';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const MOCK_SESSIONS: TestSession[] = [
  {
    id: 'session-seed-1',
    date: daysAgo(1),
    note: 'Revisit EF',
    aiExpertise:
      'Overall a solid attempt — the .NET fundamentals answer was thorough, but the EF Core question revealed a gap in understanding eager-loading strategies. Review the Include/ThenInclude pattern and how it differs from lazy loading before your next session, and pay closer attention to query translation behavior under IQueryable.',
    score: 2,
    questionIds: ['q1', 'q2', 'q3'],
    answers: { q1: 'IQueryable defers execution.', q2: 'o2', q3: ['o1', 'o2'] },
    aiGrading: {
      q1: { verdict: 'correct' },
      q2: { verdict: 'incorrect', explanation: 'Select does not eagerly load related entities — Include does.' },
      q3: { verdict: 'correct' },
    },
  },
  {
    id: 'session-seed-2',
    date: daysAgo(7),
    note: '',
    aiExpertise: 'Good progress overall, minor gaps in EF Core.',
    score: 1,
    questionIds: ['q1', 'q2', 'q3'],
    answers: { q1: '', q2: 'o1', q3: ['o1'] },
    aiGrading: {
      q1: { verdict: 'incorrect', explanation: 'No answer was provided for this question.' },
      q2: { verdict: 'correct' },
      q3: { verdict: 'partial', explanation: 'You found some but not all of the correct options.' },
    },
  },
];

let nextId = 1;

/**
 * In-memory mock for test-history data (section2-cc.md §Stubs). Same method
 * shape as a future HTTP-backed HistoryService so this can be swapped
 * without touching consumers. Sessions are kept in a signal so a Testing
 * submission is immediately visible to History/Review without a reload.
 */
@Injectable({ providedIn: 'root' })
export class HistoryMockService {
  private readonly state = signal<TestSession[]>(MOCK_SESSIONS);

  readonly sessions = this.state.asReadonly();

  getSessions(): Observable<TestSession[]> {
    return of(this.state());
  }

  getSession(id: string): TestSession | undefined {
    return this.state().find((s) => s.id === id);
  }

  addSession(session: Omit<TestSession, 'id'>): TestSession {
    const newSession: TestSession = { ...session, id: `session-${nextId++}` };
    this.state.update((sessions) => [newSession, ...sessions]);
    return newSession;
  }

  updateNote(id: string, note: string): void {
    this.state.update((sessions) => sessions.map((s) => (s.id === id ? { ...s, note } : s)));
  }

  removeSession(id: string): void {
    this.state.update((sessions) => sessions.filter((s) => s.id !== id));
  }
}
