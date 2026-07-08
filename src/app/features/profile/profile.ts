import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { UserMockService } from '../../core/services/user-mock.service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly userService = inject(UserMockService);

  protected readonly initials = this.userService.initials;
  protected readonly fullName = this.userService.fullName;

  protected readonly firstName = signal(this.userService.user().firstName);
  protected readonly lastName = signal(this.userService.user().lastName);
  protected readonly email = this.userService.user().email;

  protected readonly showSavedConfirmation = signal(false);

  protected onSave(): void {
    this.userService.updateProfile(this.firstName().trim(), this.lastName().trim());
    this.showSavedConfirmation.set(true);
    setTimeout(() => this.showSavedConfirmation.set(false), 2000);
  }

  protected onChangePassword(): void {
    alert('Change password would trigger the OAuth/password-reset flow for this account.');
  }
}
