import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { QuestionCard } from '../../shared/components/question/question';
import { QuestionMockService } from '../../core/services/question-mock.service';
import { HistoryMockService } from '../../core/services/history-mock.service';
import { QuestionGradingResult } from '../../core/models/test-session.model';

@Component({
  selector: 'app-testing',
  imports: [QuestionCard],
  templateUrl: './testing.html',
  styleUrl: './testing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Testing {
  private readonly questionService = inject(QuestionMockService);
  private readonly historyService = inject(HistoryMockService);

  protected readonly questions = this.questionService.questions;

  protected readonly answers = signal<Record<string, string | string[]>>({});
  protected readonly results = signal<Record<string, QuestionGradingResult>>({});
  protected readonly loadingIds = signal<Set<string>>(new Set());
  protected readonly submitted = signal(false);

  protected readonly submittedLabel = computed(() => (this.submitted() ? 'Submitted' : 'In progress'));

  protected isStarred(questionId: string): boolean {
    const question = this.questions().find((q) => q.id === questionId);
    return !!question?.categoryIds.includes('starred');
  }

  protected getAnswer(questionId: string): string | string[] {
    return this.answers()[questionId] ?? '';
  }

  protected setAnswer(questionId: string, value: string | string[]): void {
    this.answers.update((current) => ({ ...current, [questionId]: value }));
  }

  protected toggleStar(questionId: string): void {
    this.questionService.toggleCategoryMembership(questionId, 'starred');
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    const questions = this.questions();
    this.loadingIds.set(new Set(questions.map((q) => q.id)));

    const gradingByQuestionId = new Map(
      questions.map((q) => [q.id, this.gradeMock(q.answerType, q.options, this.getAnswer(q.id))]),
    );

    for (const question of questions) {
      const result = gradingByQuestionId.get(question.id)!;
      const delay = 500 + Math.random() * 900;
      setTimeout(() => {
        this.results.update((current) => ({ ...current, [question.id]: result }));
        this.loadingIds.update((current) => {
          const next = new Set(current);
          next.delete(question.id);
          return next;
        });
      }, delay);
    }

    const score = [...gradingByQuestionId.values()].filter((r) => r.verdict === 'correct').length;

    const session = this.historyService.addSession({
      date: new Date().toISOString(),
      note: '',
      aiExpertise: `Scored ${score}/${questions.length} on this test.`,
      score,
      questionIds: questions.map((q) => q.id),
      answers: { ...this.answers() },
      aiGrading: Object.fromEntries(gradingByQuestionId),
    });
    console.log(`[Testing] Session saved: ${session.id} — open it with:`);
    console.log(
      `history.pushState({}, '', '/review?session=${session.id}'); window.dispatchEvent(new PopStateEvent('popstate'));`,
    );
  }

  protected onRetry(): void {
    this.submitted.set(false);
    this.answers.set({});
    this.results.set({});
    this.loadingIds.set(new Set());
  }

  private gradeMock(
    answerType: string,
    options: { id: string; isCorrect: boolean }[] | undefined,
    answer: string | string[],
  ): QuestionGradingResult {
    if (answerType === 'text') {
      const answered = typeof answer === 'string' && answer.trim().length > 0;
      return answered
        ? { verdict: 'correct' }
        : { verdict: 'incorrect', explanation: 'No answer was provided for this question.' };
    }

    const correctIds = new Set((options ?? []).filter((o) => o.isCorrect).map((o) => o.id));
    const selectedIds = new Set(Array.isArray(answer) ? answer : answer ? [answer] : []);

    const missing = [...correctIds].some((id) => !selectedIds.has(id));
    const extra = [...selectedIds].some((id) => !correctIds.has(id));

    if (!missing && !extra) return { verdict: 'correct' };
    if (!extra && selectedIds.size > 0) {
      return { verdict: 'partial', explanation: 'You found some but not all of the correct options.' };
    }
    return { verdict: 'incorrect', explanation: 'The selected option(s) do not match the correct answer.' };
  }
}
