import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Category, CategorySettings } from '../models/category.model';

function defaultSettings(): CategorySettings {
  return {
    questionsPerTest: 10,
    questionSource: 'mix',
    sourceWeights: { ai: 34, db: 33, manual: 33 },
    difficultyMix: { easy: 33, medium: 34, hard: 33 },
  };
}

const MOCK_CATEGORIES: Category[] = [
  { id: 'starred', name: 'Starred', parentId: null, special: true, settings: defaultSettings() },
  { id: 'saved', name: 'Saved', parentId: null, special: true, settings: defaultSettings() },
  { id: 'dotnet', name: '.NET', parentId: null, settings: defaultSettings() },
  { id: 'ef', name: 'EF', parentId: null, settings: defaultSettings() },
  { id: 'ai', name: 'AI', parentId: null, settings: defaultSettings() },
  { id: 'claude', name: 'Claude', parentId: 'ai', settings: defaultSettings() },
  { id: 'openai', name: 'OpenAI', parentId: 'ai', settings: defaultSettings() },
];

let nextId = 1;

/**
 * In-memory mock for category data (section2-cc.md §Stubs). Same method
 * shape as a future HTTP-backed CategoryService so this can be swapped
 * without touching consumers. Mutating methods keep state in a signal so
 * tree edits (rename/add/delete) are visible without a page reload.
 */
@Injectable({ providedIn: 'root' })
export class CategoryMockService {
  private readonly state = signal<Category[]>(MOCK_CATEGORIES);

  getCategories(): Observable<Category[]> {
    return of(this.state());
  }

  readonly categories = this.state.asReadonly();

  rename(id: string, name: string): void {
    this.state.update((categories) => categories.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  updateSettings(id: string, settings: CategorySettings): void {
    this.state.update((categories) => categories.map((c) => (c.id === id ? { ...c, settings } : c)));
  }

  addSubcategory(parentId: string): Category {
    const newCategory: Category = {
      id: `new-${nextId++}`,
      name: 'New category',
      parentId,
      settings: defaultSettings(),
    };
    this.state.update((categories) => [...categories, newCategory]);
    return newCategory;
  }

  delete(id: string): void {
    this.state.update((categories) => {
      const idsToRemove = new Set<string>();
      const collect = (targetId: string) => {
        idsToRemove.add(targetId);
        categories.filter((c) => c.parentId === targetId).forEach((c) => collect(c.id));
      };
      collect(id);
      return categories.filter((c) => !idsToRemove.has(c.id));
    });
  }

  private isDescendantOf(categories: Category[], candidateId: string, ancestorId: string): boolean {
    let current = categories.find((c) => c.id === candidateId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = categories.find((c) => c.id === current!.parentId);
    }
    return false;
  }

  /** Reparents/reorders a dragged category relative to a target: 'before'/'after' make it
   *  a sibling of the target, 'inside' makes it the target's last child. Array order encodes
   *  sibling display order since Category has no explicit index field. */
  move(draggedId: string, targetId: string, position: 'before' | 'inside' | 'after'): void {
    if (draggedId === targetId) return;
    this.state.update((categories) => {
      if (this.isDescendantOf(categories, targetId, draggedId)) return categories;

      const dragged = categories.find((c) => c.id === draggedId);
      const target = categories.find((c) => c.id === targetId);
      if (!dragged || !target) return categories;

      const newParentId = position === 'inside' ? target.id : target.parentId;
      const withoutDragged = categories.filter((c) => c.id !== draggedId);
      const movedDragged = { ...dragged, parentId: newParentId };

      if (position === 'inside') {
        return [...withoutDragged, movedDragged];
      }

      const targetIndex = withoutDragged.findIndex((c) => c.id === targetId);
      const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
      return [...withoutDragged.slice(0, insertAt), movedDragged, ...withoutDragged.slice(insertAt)];
    });
  }
}
