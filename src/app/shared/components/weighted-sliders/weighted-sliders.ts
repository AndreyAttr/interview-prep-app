import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-weighted-sliders',
  imports: [],
  templateUrl: './weighted-sliders.html',
  styleUrl: './weighted-sliders.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightedSliders {
  readonly labels = input.required<string[]>();
  readonly values = input.required<number[]>();
  readonly valuesChange = output<number[]>();

  protected readonly sum = computed(() => this.values().reduce((total, v) => total + v, 0));

  protected onSliderChange(index: number, rawValue: number): void {
    const current = this.values();
    const next = [...current];

    if (index === 0) {
      const remainder = 100 - rawValue;
      const otherSum = current[1] + current[2];
      const ratio = otherSum > 0 ? current[1] / otherSum : 0.5;
      const second = Math.round(remainder * ratio);
      next[0] = rawValue;
      next[1] = second;
      next[2] = remainder - second;
    } else if (index === 1) {
      const remainder = Math.max(0, 100 - current[0] - rawValue);
      next[1] = rawValue;
      next[2] = remainder;
    } else {
      const remainder = Math.max(0, 100 - current[0] - rawValue);
      next[2] = rawValue;
      next[1] = remainder;
    }

    this.valuesChange.emit(next);
  }
}
