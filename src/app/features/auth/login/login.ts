import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { NavigationHistoryService } from '../../../core/services/navigation-history.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly router = inject(Router);
  private readonly navHistory = inject(NavigationHistoryService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.signIn();
  }

  protected signIn(): void {
    if (!this.email().trim()) {
      this.error.set('Please enter your email.');
      return;
    }
    if (!this.password()) {
      this.error.set('Please enter your password.');
      return;
    }
    this.completeLogin();
  }

  protected signInWithGoogle(): void {
    this.completeLogin();
  }

  protected signInWithMicrosoft(): void {
    this.completeLogin();
  }

  private completeLogin(): void {
    this.navHistory.clear();
    this.router.navigate(['/dashboard']);
  }
}
