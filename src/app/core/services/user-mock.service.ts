import { Injectable, computed, signal } from '@angular/core';

import { User } from '../models/user.model';

const MOCK_USER: User = {
  firstName: 'Jordan',
  lastName: 'Doe',
  email: 'jordan.doe@example.com',
};

/**
 * In-memory mock for the current user's profile (section2-cc.md §Stubs).
 * Same signal-backed pattern as the other mock services — Sidebar/Topbar
 * read `initials`/`fullName` from here so they stay in sync with Profile edits.
 */
@Injectable({ providedIn: 'root' })
export class UserMockService {
  private readonly state = signal<User>(MOCK_USER);

  readonly user = this.state.asReadonly();

  readonly fullName = computed(() => `${this.state().firstName} ${this.state().lastName}`.trim());

  readonly initials = computed(() => {
    const { firstName, lastName } = this.state();
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  });

  updateProfile(firstName: string, lastName: string): void {
    this.state.update((user) => ({ ...user, firstName, lastName }));
  }
}
