import { Routes } from '@angular/router';

import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
        data: { title: 'Dashboard' },
      },
      {
        path: 'testing',
        loadComponent: () => import('./features/testing/testing').then(m => m.Testing),
        data: { title: 'Testing' },
      },
      {
        path: 'review',
        loadComponent: () => import('./features/review/review').then(m => m.Review),
        data: { title: 'Review' },
      },
      {
        path: 'add-question',
        loadComponent: () => import('./features/add-question/add-question').then(m => m.AddQuestion),
        data: { title: 'Add Question' },
      },
      {
        path: 'history',
        loadComponent: () => import('./features/history/history').then(m => m.History),
        data: { title: 'History' },
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then(m => m.Profile),
        data: { title: 'Profile' },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
