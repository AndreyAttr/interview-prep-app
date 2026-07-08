import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ai-expertise-modal',
  imports: [],
  templateUrl: './ai-expertise-modal.html',
  styleUrl: './ai-expertise-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiExpertiseModal {
  readonly date = input.required<string>();
  readonly score = input.required<number>();
  readonly total = input.required<number>();
  readonly text = input.required<string>();

  readonly close = output<void>();

  protected onClose(): void {
    this.close.emit();
  }
}
