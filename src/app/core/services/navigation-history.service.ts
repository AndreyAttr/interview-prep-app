import { Injectable, computed, signal } from '@angular/core';

/**
 * Breadcrumb stack for the shell's Back button (HANDOFF-CC.md §7).
 * Deliberately not the browser History API — only user-initiated
 * in-app navigations are pushed; the stack is cleared on login.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly stack = signal<string[]>([]);

  readonly canGoBack = computed(() => this.stack().length > 0);

  push(url: string): void {
    this.stack.update(s => [...s, url]);
  }

  pop(): string | null {
    const current = this.stack();
    if (current.length === 0) return null;
    const previous = current[current.length - 1];
    this.stack.set(current.slice(0, -1));
    return previous;
  }

  clear(): void {
    this.stack.set([]);
  }
}
