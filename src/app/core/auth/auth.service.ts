import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

const SESSION_KEY = 'invitaciones.admin.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isAuthenticated = signal(this.readSession());

  login(username: string, password: string): boolean {
    const { username: u, password: p } = environment.adminCredentials;
    if (username === u && password === p) {
      this.writeSession(true);
      this.isAuthenticated.set(true);
      return true;
    }
    return false;
  }

  logout(): void {
    this.writeSession(false);
    this.isAuthenticated.set(false);
  }

  private readSession(): boolean {
    if (!this.isBrowser) return false;
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  private writeSession(active: boolean): void {
    if (!this.isBrowser) return;
    if (active) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
  }
}
