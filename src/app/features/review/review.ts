import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { QuestionCard } from '../../shared/components/question/question';
import { QuestionMockService } from '../../core/services/question-mock.service';
import { HistoryMockService } from '../../core/services/history-mock.service';

@Component({
  selector: 'app-review',
  imports: [QuestionCard],
  templateUrl: './review.html',
  styleUrl: './review.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Review {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questionService = inject(QuestionMockService);
  private readonly historyService = inject(HistoryMockService);

  private readonly sessionId = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('session'))), {
    initialValue: null,
  });

  protected readonly session = computed(() => {
    const id = this.sessionId();
    return id ? this.historyService.getSession(id) : undefined;
  });

  protected readonly questions = computed(() => {
    const session = this.session();
    if (!session) return [];
    const byId = new Map(this.questionService.questions().map((q) => [q.id, q]));
    return session.questionIds.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q);
  });

  protected readonly correctCount = computed(() => {
    const session = this.session();
    if (!session?.aiGrading) return 0;
    return Object.values(session.aiGrading).filter((r) => r.verdict === 'correct').length;
  });

  protected isStarred(questionId: string): boolean {
    const question = this.questionService.questions().find((q) => q.id === questionId);
    return !!question?.categoryIds.includes('starred');
  }

  protected isSaved(questionId: string): boolean {
    const question = this.questionService.questions().find((q) => q.id === questionId);
    return !!question?.categoryIds.includes('saved');
  }

  protected getAnswer(questionId: string): string | string[] {
    return this.session()?.answers[questionId] ?? '';
  }

  protected toggleStar(questionId: string): void {
    this.questionService.toggleCategoryMembership(questionId, 'starred');
  }

  protected toggleSave(questionId: string): void {
    this.questionService.toggleCategoryMembership(questionId, 'saved');
  }

  protected goToTesting(): void {
    this.router.navigateByUrl('/testing');
  }
}
