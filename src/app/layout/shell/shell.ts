import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

import { Topbar } from '../topbar/topbar';
import { Sidebar } from '../sidebar/sidebar';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, MatIconModule, Topbar, Sidebar],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly navHistory = inject(NavigationHistoryService);

  protected readonly pageTitle = signal('');

  private previousUrl: string | null = null;
  private isNavigatingBack = false;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(event => this.onNavigationEnd(event));
  }

  private onNavigationEnd(event: NavigationEnd): void {
    this.pageTitle.set(this.readTitleFromRoute());

    // Only push user-initiated in-app navigations — not the initial route
    // load, and not the navigation triggered by the Back button itself.
    if (this.previousUrl !== null && !this.isNavigatingBack && this.previousUrl !== event.urlAfterRedirects) {
      this.navHistory.push(this.previousUrl);
    }
    this.isNavigatingBack = false;
    this.previousUrl = event.urlAfterRedirects;
  }

  private readTitleFromRoute(): string {
    let current = this.route.firstChild;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    return (current?.snapshot.data['title'] as string) ?? '';
  }

  protected goBack(): void {
    const previousUrl = this.navHistory.pop();
    if (previousUrl) {
      this.isNavigatingBack = true;
      this.router.navigateByUrl(previousUrl);
    }
  }
}
