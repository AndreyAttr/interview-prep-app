import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { CategoryMockService } from '../../core/services/category-mock.service';
import { QuestionMockService } from '../../core/services/question-mock.service';
import { Category, CategorySettings } from '../../core/models/category.model';
import { Question } from '../../core/models/question.model';
import { CategorySettingsModal } from '../../shared/components/category-settings-modal/category-settings-modal';

export interface CategoryNode extends Category {
  children: CategoryNode[];
  depth: number;
}

interface ContextMenuState {
  id: string;
  x: number;
  y: number;
}

export type DropZone = 'before' | 'inside' | 'after';

interface DropIndicator {
  targetId: string;
  zone: DropZone;
}

function buildTree(categories: Category[], parentId: string | null, depth: number): CategoryNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, depth, children: buildTree(categories, c.id, depth + 1) }));
}

@Component({
  selector: 'app-category-tree',
  imports: [MatIconModule, CategorySettingsModal],
  templateUrl: './category-tree.html',
  styleUrl: './category-tree.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTree {
  private readonly categoryService = inject(CategoryMockService);
  private readonly questionService = inject(QuestionMockService);

  private readonly categories = this.categoryService.categories;
  private readonly questions = this.questionService.questions;

  protected readonly expandedIds = signal(new Set<string>());
  protected readonly contextMenu = signal<ContextMenuState | null>(null);
  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameValue = signal('');

  protected readonly draggedId = signal<string | null>(null);
  protected readonly dropIndicator = signal<DropIndicator | null>(null);
  protected readonly settingsCategoryId = signal<string | null>(null);

  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  protected readonly tree = computed(() => buildTree(this.categories(), null, 0));
  protected readonly visibleNodes = computed(() => this.flattenVisible(this.tree()));

  protected readonly contextMenuNode = computed(() => {
    const cm = this.contextMenu();
    if (!cm) return null;
    return this.categories().find((c) => c.id === cm.id) ?? null;
  });

  protected readonly settingsCategory = computed(() => {
    const id = this.settingsCategoryId();
    if (!id) return null;
    return this.categories().find((c) => c.id === id) ?? null;
  });

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggleExpanded(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }

  protected questionsFor(categoryId: string): Question[] {
    return this.questions().filter((q) => q.categoryIds.includes(categoryId));
  }

  protected flattenVisible(nodes: CategoryNode[]): CategoryNode[] {
    const result: CategoryNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (this.isExpanded(node.id) && node.children.length > 0) {
        result.push(...this.flattenVisible(node.children));
      }
    }
    return result;
  }

  protected openMenuFromButton(event: MouseEvent, id: string): void {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.contextMenu.set({ id, x: rect.right, y: rect.bottom });
  }

  protected openMenuFromContextMenu(event: MouseEvent, node: CategoryNode): void {
    event.preventDefault();
    if (node.special) return;
    this.contextMenu.set({ id: node.id, x: event.clientX, y: event.clientY });
  }

  protected closeMenu(): void {
    this.contextMenu.set(null);
  }

  protected startRename(node: Category): void {
    this.closeMenu();
    this.renamingId.set(node.id);
    this.renameValue.set(node.name);
    queueMicrotask(() => this.renameInput()?.nativeElement.focus());
  }

  protected commitRename(): void {
    const id = this.renamingId();
    if (id !== null) {
      const value = this.renameValue().trim();
      if (value.length > 0) {
        this.categoryService.rename(id, value);
      }
    }
    this.renamingId.set(null);
  }

  protected cancelRename(): void {
    this.renamingId.set(null);
  }

  protected addSubcategory(node: Category): void {
    this.closeMenu();
    const created = this.categoryService.addSubcategory(node.id);
    const next = new Set(this.expandedIds());
    next.add(node.id);
    this.expandedIds.set(next);
    this.startRename(created);
  }

  protected deleteCategory(node: Category): void {
    this.closeMenu();
    this.categoryService.delete(node.id);
  }

  protected openSettings(node: Category): void {
    this.closeMenu();
    this.settingsCategoryId.set(node.id);
  }

  protected saveSettings(settings: CategorySettings): void {
    const id = this.settingsCategoryId();
    if (id !== null) {
      this.categoryService.updateSettings(id, settings);
    }
    this.settingsCategoryId.set(null);
  }

  protected closeSettings(): void {
    this.settingsCategoryId.set(null);
  }

  protected onDragStart(event: DragEvent, node: CategoryNode): void {
    if (node.special) {
      event.preventDefault();
      return;
    }
    this.draggedId.set(node.id);
    event.dataTransfer?.setData('text/plain', node.id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  protected onDragEnd(): void {
    this.draggedId.set(null);
    this.dropIndicator.set(null);
  }

  protected onDragOver(event: DragEvent, node: CategoryNode): void {
    const draggedId = this.draggedId();
    if (draggedId === null || draggedId === node.id) return;
    event.preventDefault();

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const ratio = offsetY / rect.height;

    const zone: DropZone = ratio < 0.28 ? 'before' : ratio > 0.72 ? 'after' : 'inside';
    this.dropIndicator.set({ targetId: node.id, zone });
  }

  protected onDragLeave(node: CategoryNode): void {
    if (this.dropIndicator()?.targetId === node.id) {
      this.dropIndicator.set(null);
    }
  }

  protected onDrop(event: DragEvent, node: CategoryNode): void {
    event.preventDefault();
    const draggedId = this.draggedId();
    const indicator = this.dropIndicator();
    this.draggedId.set(null);
    this.dropIndicator.set(null);
    if (draggedId === null || !indicator || indicator.targetId !== node.id) return;

    this.categoryService.move(draggedId, node.id, indicator.zone);
  }
}
