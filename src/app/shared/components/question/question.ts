import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { Question } from '../../../core/models/question.model';
import { QuestionGradingResult } from '../../../core/models/test-session.model';

export type QuestionCardMode = 'testing' | 'review';

@Component({
  selector: 'app-question',
  imports: [],
  templateUrl: './question.html',
  styleUrl: './question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionCard {
  readonly mode = input.required<QuestionCardMode>();
  readonly question = input.required<Question>();
  readonly submitted = input(false);
  readonly loading = input(false);
  readonly result = input<QuestionGradingResult | undefined>(undefined);
  readonly starred = input(false);
  readonly saved = input(false);

  readonly answer = model<string | string[]>('');

  readonly starToggle = output<void>();
  readonly save = output<void>();
  readonly textChange = output<string>();

  protected readonly cardBorderColor = computed(() => {
    if (!this.submitted() || this.loading()) return 'var(--border)';
    const result = this.result();
    if (!result) return 'var(--border)';
    if (result.verdict === 'correct') return 'var(--success)';
    if (result.verdict === 'partial') return 'var(--status-partial)';
    return 'var(--danger)';
  });

  protected readonly showAiExpertise = computed(() => {
    const result = this.result();
    return this.submitted() && !this.loading() && !!result && result.verdict !== 'correct' && !!result.explanation;
  });

  protected readonly selectedOptionIds = computed<string[]>(() => {
    const value = this.answer();
    return Array.isArray(value) ? value : value ? [value] : [];
  });

  protected onQuestionTextChange(value: string): void {
    this.textChange.emit(value);
  }

  protected onTextAnswerChange(value: string): void {
    this.answer.set(value);
  }

  protected onRadioChange(optionId: string): void {
    this.answer.set(optionId);
  }

  protected onCheckboxChange(optionId: string, checked: boolean): void {
    const current = this.selectedOptionIds();
    this.answer.set(checked ? [...current, optionId] : current.filter((id) => id !== optionId));
  }

  protected isOptionCorrectHighlight(optionId: string): boolean {
    if (!this.submitted() || this.loading()) return false;
    const option = this.question().options?.find((o) => o.id === optionId);
    return !!option?.isCorrect;
  }

  protected isOptionWrongHighlight(optionId: string): boolean {
    if (!this.submitted() || this.loading()) return false;
    const option = this.question().options?.find((o) => o.id === optionId);
    return !!option && !option.isCorrect && this.selectedOptionIds().includes(optionId);
  }

  protected onStarClick(): void {
    this.starToggle.emit();
  }

  protected onSaveClick(): void {
    this.save.emit();
  }
}
