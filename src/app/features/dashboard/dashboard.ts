import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { HistoryMockService } from '../../core/services/history-mock.service';
import { QuestionMockService } from '../../core/services/question-mock.service';

interface DayBar {
  key: string;
  label: string;
  count: number;
  avgPct: number;
  barHeightPct: number;
}

interface CategoryStat {
  categoryLabel: string;
  correct: number;
  total: number;
  pct: number;
}

const DAYS_SHOWN = 14;
const CHART_HEIGHT = 100;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly historyService = inject(HistoryMockService);
  private readonly questionService = inject(QuestionMockService);

  protected readonly chartHeight = CHART_HEIGHT;

  private readonly sessionTotals = computed(() =>
    this.historyService.sessions().map((s) => ({ ...s, total: s.questionIds.length })),
  );

  protected readonly totalTests = computed(() => this.sessionTotals().length);

  protected readonly testsThisMonth = computed(() => {
    const now = new Date();
    return this.sessionTotals().filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  });

  protected readonly averageScorePct = computed(() => {
    const sessions = this.sessionTotals();
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + (s.score / s.total) * 100, 0);
    return Math.round(sum / sessions.length);
  });

  protected readonly bestSession = computed(() => {
    const sessions = this.sessionTotals();
    if (sessions.length === 0) return undefined;
    return sessions.reduce((best, s) => (s.score / s.total > best.score / best.total ? s : best));
  });

  protected readonly dayBars = computed<DayBar[]>(() => {
    const sessions = this.sessionTotals();
    const now = new Date();

    const days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (DAYS_SHOWN - 1 - i));
      const key = d.toISOString().slice(0, 10);
      const daySessions = sessions.filter((s) => s.date.slice(0, 10) === key);
      const count = daySessions.length;
      const avgPct = count
        ? daySessions.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / count
        : 0;
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return { key, label, count, avgPct };
    });

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    return days.map((d) => ({
      ...d,
      barHeightPct: d.count > 0 ? Math.max(8, (d.count / maxCount) * 100) : 2,
    }));
  });

  protected readonly categoryStats = computed<CategoryStat[]>(() => {
    const sessions = this.sessionTotals();
    const questions = this.questionService.questions();
    const byId = new Map(questions.map((q) => [q.id, q]));
    const stats = new Map<string, CategoryStat>();

    for (const session of sessions) {
      for (const questionId of session.questionIds) {
        const question = byId.get(questionId);
        if (!question) continue;
        const label = question.categoryLabel;
        const entry = stats.get(label) ?? { categoryLabel: label, correct: 0, total: 0, pct: 0 };
        entry.total += 1;
        if (session.aiGrading?.[questionId]?.verdict === 'correct') entry.correct += 1;
        stats.set(label, entry);
      }
    }

    return Array.from(stats.values())
      .map((s) => ({ ...s, pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);
  });

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  }

  protected scoreClass(pct: number): string {
    if (pct >= 70) return 'score-good';
    if (pct >= 40) return 'score-mid';
    return 'score-bad';
  }
}
