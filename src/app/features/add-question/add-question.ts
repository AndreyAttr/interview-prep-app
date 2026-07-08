import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AnswerType } from '../../core/models/question.model';
import { CategoryMockService } from '../../core/services/category-mock.service';
import { QuestionMockService } from '../../core/services/question-mock.service';

interface ImageAttachment {
  name: string;
  src: string;
}

@Component({
  selector: 'app-add-question',
  templateUrl: './add-question.html',
  styleUrl: './add-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddQuestion {
  private readonly questionService = inject(QuestionMockService);
  private readonly categoryService = inject(CategoryMockService);

  protected readonly text = signal('');
  protected readonly answerType = signal<AnswerType>('text');
  protected readonly options = signal<string[]>(['', '']);
  protected readonly correctIndex = signal(0);
  protected readonly correctIndices = signal<Set<number>>(new Set());
  protected readonly images = signal<ImageAttachment[]>([]);
  protected readonly dragOver = signal(false);
  protected readonly saved = signal(false);
  protected readonly selectedCategoryIds = signal<Set<string>>(new Set());

  protected readonly assignableCategories = computed(() =>
    this.categoryService.categories().filter((c) => !c.special),
  );

  private savedTimeout?: ReturnType<typeof setTimeout>;

  protected setAnswerType(type: AnswerType): void {
    this.answerType.set(type);
  }

  protected setOption(index: number, value: string): void {
    this.options.update((opts) => opts.map((o, i) => (i === index ? value : o)));
  }

  protected addOption(): void {
    this.options.update((opts) => [...opts, '']);
  }

  protected removeOption(index: number): void {
    if (this.options().length <= 2) return;
    this.options.update((opts) => opts.filter((_, i) => i !== index));
    this.correctIndices.update((set) => {
      const next = new Set<number>();
      for (const i of set) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
    if (this.correctIndex() >= this.options().length) this.correctIndex.set(0);
  }

  protected toggleCategory(categoryId: string): void {
    this.selectedCategoryIds.update((set) => {
      const next = new Set(set);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  protected toggleCorrectIndex(index: number): void {
    this.correctIndices.update((set) => {
      const next = new Set(set);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDragLeave(): void {
    this.dragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files) this.handleFiles(event.dataTransfer.files);
  }

  protected onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files = Array.from(items)
      .map((item) => (item.kind === 'file' ? item.getAsFile() : null))
      .filter((f): f is File => f !== null);
    this.handleFiles(files);
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.handleFiles(input.files);
    input.value = '';
  }

  private handleFiles(files: FileList | File[]): void {
    Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.images.update((imgs) => [...imgs, { name: file.name, src: reader.result as string }]);
        };
        reader.readAsDataURL(file);
      });
  }

  protected removeImage(index: number): void {
    this.images.update((imgs) => imgs.filter((_, i) => i !== index));
  }

  protected get canSubmit(): boolean {
    return this.text().trim().length > 0;
  }

  protected submit(): void {
    if (!this.canSubmit) return;

    const type = this.answerType();
    const options =
      type === 'text'
        ? undefined
        : this.options().map((label, i) => ({
            id: `o${i + 1}`,
            label,
            isCorrect: type === 'radio' ? i === this.correctIndex() : this.correctIndices().has(i),
          }));

    const categoryIds = Array.from(this.selectedCategoryIds());
    const categories = this.assignableCategories();
    const categoryLabel = categories.find((c) => c.id === categoryIds[0])?.name ?? 'Uncategorized';

    this.questionService.addQuestion({
      text: this.text().trim(),
      answerType: type,
      options,
      categoryIds,
      categoryLabel,
      difficulty: 'medium',
      images: this.images().map((img) => img.src),
      source: 'manual',
    });

    this.resetForm();
    this.saved.set(true);
    clearTimeout(this.savedTimeout);
    this.savedTimeout = setTimeout(() => this.saved.set(false), 2500);
  }

  private resetForm(): void {
    this.text.set('');
    this.answerType.set('text');
    this.options.set(['', '']);
    this.correctIndex.set(0);
    this.correctIndices.set(new Set());
    this.images.set([]);
    this.selectedCategoryIds.set(new Set());
  }
}
