import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { CategoryTree } from '../category-tree/category-tree';
import { UserMockService } from '../../core/services/user-mock.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/testing', label: 'Testing', icon: 'quiz' },
  { path: '/review', label: 'Review', icon: 'fact_check' },
  { path: '/add-question', label: 'Add Question', icon: 'add_circle' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, CategoryTree],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  protected readonly navItems = NAV_ITEMS;
  protected readonly userService = inject(UserMockService);
}
