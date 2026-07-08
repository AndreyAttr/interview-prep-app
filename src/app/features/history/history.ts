import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { HistoryMockService } from '../../core/services/history-mock.service';
import { AiExpertiseModal } from '../../shared/components/ai-expertise-modal/ai-expertise-modal';

type ViewMode = 'list' | 'table';

@Component({
  selector: 'app-history',
  imports: [AiExpertiseModal],
  templateUrl: './history.html',
  styleUrl: './history.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class History {
  private readonly router = inject(Router);
  private readonly historyService = inject(HistoryMockService);

  protected readonly sessions = this.historyService.sessions;
  protected readonly viewMode = signal<ViewMode>('list');
  protected readonly expertiseModalSessionId = signal<string | null>(null);

  protected readonly expertiseModalSession = computed(() => {
    const id = this.expertiseModalSessionId();
    return id ? this.sessions().find((s) => s.id === id) : undefined;
  });

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected formatDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  }

  protected truncate(text: string, maxLength = 90): string {
    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
  }

  protected openReview(sessionId: string): void {
    this.router.navigate(['/review'], { queryParams: { session: sessionId } });
  }

  protected onNoteChange(sessionId: string, note: string): void {
    this.historyService.updateNote(sessionId, note);
  }

  protected openExpertiseModal(sessionId: string): void {
    this.expertiseModalSessionId.set(sessionId);
  }

  protected closeExpertiseModal(): void {
    this.expertiseModalSessionId.set(null);
  }

  protected repeat(): void {
    this.router.navigate(['/testing']);
  }

  protected remove(sessionId: string): void {
    if (confirm('Remove this history entry? This cannot be undone.')) {
      this.historyService.removeSession(sessionId);
    }
  }
}
