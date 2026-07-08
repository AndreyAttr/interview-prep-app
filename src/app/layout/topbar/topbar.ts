import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';

import { ThemeService } from '../../core/services/theme.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { UserMockService } from '../../core/services/user-mock.service';

@Component({
  selector: 'app-topbar',
  imports: [MatIconModule, MatMenuModule, MatFormFieldModule, MatInputModule, MatDividerModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  private readonly router = inject(Router);
  private readonly navHistory = inject(NavigationHistoryService);
  protected readonly themeService = inject(ThemeService);
  protected readonly userService = inject(UserMockService);

  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  protected goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  protected logOut(): void {
    this.navHistory.clear();
    this.router.navigate(['/login']);
  }
}
