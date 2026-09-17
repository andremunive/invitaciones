import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'invitacion/:token',
    loadComponent: () =>
      import('./invitation/invitation.component').then((m) => m.InvitationComponent),
  },
  { path: '**', redirectTo: 'admin' },
];
