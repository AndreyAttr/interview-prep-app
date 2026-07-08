import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Category, CategorySettings, QuestionSource } from '../../../core/models/category.model';
import { WeightedSliders } from '../weighted-sliders/weighted-sliders';

interface SourceOption {
  value: QuestionSource;
  label: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  { value: 'ai', label: 'AI Generated' },
  { value: 'db', label: 'Database' },
  { value: 'manual', label: 'Manual' },
  { value: 'mix', label: 'Mix' },
];

const DEFAULT_SETTINGS: CategorySettings = {
  questionsPerTest: 10,
  questionSource: 'mix',
  sourceWeights: { ai: 34, db: 33, manual: 33 },
  difficultyMix: { easy: 33, medium: 34, hard: 33 },
};

@Component({
  selector: 'app-category-settings-modal',
  imports: [WeightedSliders],
  templateUrl: './category-settings-modal.html',
  styleUrl: './category-settings-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorySettingsModal {
  readonly category = input.required<Category>();
  readonly save = output<CategorySettings>();
  readonly cancel = output<void>();

  protected readonly sourceOptions = SOURCE_OPTIONS;

  private readonly initialSettings = computed<CategorySettings>(() => this.category().settings ?? DEFAULT_SETTINGS);

  protected readonly questionsPerTest = signal<number | null>(null);
  protected readonly questionSource = signal<QuestionSource | null>(null);
  protected readonly sourceWeights = signal<[number, number, number] | null>(null);
  protected readonly difficultyMix = signal<[number, number, number] | null>(null);

  protected readonly effectiveQuestionsPerTest = computed(
    () => this.questionsPerTest() ?? this.initialSettings().questionsPerTest,
  );
  protected readonly effectiveQuestionSource = computed(
    () => this.questionSource() ?? this.initialSettings().questionSource,
  );
  protected readonly effectiveSourceWeights = computed<[number, number, number]>(() => {
    const override = this.sourceWeights();
    if (override) return override;
    const w = this.initialSettings().sourceWeights;
    return w ? [w.ai, w.db, w.manual] : [34, 33, 33];
  });
  protected readonly effectiveDifficultyMix = computed<[number, number, number]>(() => {
    const override = this.difficultyMix();
    if (override) return override;
    const d = this.initialSettings().difficultyMix;
    return [d.easy, d.medium, d.hard];
  });

  protected selectSource(value: QuestionSource): void {
    this.questionSource.set(value);
  }

  protected onSave(): void {
    const questionSource = this.effectiveQuestionSource();
    const [ai, db, manual] = this.effectiveSourceWeights();
    const [easy, medium, hard] = this.effectiveDifficultyMix();

    const settings: CategorySettings = {
      questionsPerTest: this.effectiveQuestionsPerTest(),
      questionSource,
      difficultyMix: { easy, medium, hard },
      ...(questionSource === 'mix' ? { sourceWeights: { ai, db, manual } } : {}),
    };

    this.save.emit(settings);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
