import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { GuestsService } from '../../core/guests/guests.service';
import { Guest, RsvpStatus } from '../../core/guests/guest.model';

interface RsvpMeta {
  label: string;
  badgeClass: string;
}

const RSVP_META: Record<RsvpStatus, RsvpMeta> = {
  pending: { label: 'Pendiente', badgeClass: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmado', badgeClass: 'bg-emerald-100 text-emerald-800' },
  declined: { label: 'No asiste', badgeClass: 'bg-rose-100 text-rose-800' },
};

type StatusFilter = 'all' | RsvpStatus;

interface FilterOption {
  value: StatusFilter;
  label: string;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'declined', label: 'No asisten' },
];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly guestsService = inject(GuestsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly guests = signal<Guest[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly copiedToken = signal<string | null>(null);
  readonly statusFilter = signal<StatusFilter>('all');

  readonly filterOptions = FILTER_OPTIONS;

  readonly totalSeats = computed(() =>
    this.guests()
      .filter((g) => g.rsvp_status === 'confirmed')
      .reduce((sum, g) => sum + g.seats, 0),
  );

  readonly statusCounts = computed(() => {
    const counts: Record<StatusFilter, number> = { all: 0, pending: 0, confirmed: 0, declined: 0 };
    for (const g of this.guests()) {
      counts.all += g.seats;
      counts[g.rsvp_status] += g.seats;
    }
    return counts;
  });

  readonly filteredGuests = computed(() => {
    const filter = this.statusFilter();
    const list = this.guests();
    return filter === 'all' ? list : list.filter((g) => g.rsvp_status === filter);
  });

  readonly filteredSeats = computed(() =>
    this.filteredGuests().reduce((sum, g) => sum + g.seats, 0),
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    seats: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  constructor() {
    if (this.isBrowser) void this.loadGuests();
  }

  async loadGuests(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.guests.set(await this.guestsService.list());
    } catch (e) {
      this.error.set(this.messageFromError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const { name, seats } = this.form.getRawValue();
    try {
      const created = await this.guestsService.create(name.trim(), seats);
      this.guests.update((list) => [created, ...list]);
      this.form.reset({ name: '', seats: 1 });
    } catch (e) {
      this.error.set(this.messageFromError(e));
    } finally {
      this.saving.set(false);
    }
  }

  async remove(guest: Guest): Promise<void> {
    if (!this.isBrowser) return;
    if (!confirm(`¿Eliminar la invitación de ${guest.name}?`)) return;
    try {
      await this.guestsService.remove(guest.id);
      this.guests.update((list) => list.filter((g) => g.id !== guest.id));
    } catch (e) {
      this.error.set(this.messageFromError(e));
    }
  }

  invitationUrl(token: string): string {
    if (!this.isBrowser) return `/invitacion/${token}`;
    return `${window.location.origin}/invitacion/${token}`;
  }

  async copyLink(token: string): Promise<void> {
    if (!this.isBrowser) return;
    try {
      await navigator.clipboard.writeText(this.invitationUrl(token));
      this.copiedToken.set(token);
      setTimeout(() => {
        if (this.copiedToken() === token) this.copiedToken.set(null);
      }, 2000);
    } catch {
      this.error.set('No se pudo copiar al portapapeles.');
    }
  }

  shareWhatsApp(guest: Guest): void {
    if (!this.isBrowser) return;
    const url = this.invitationUrl(guest.token);
    const text =
      `Se acerca mi cumpleaños número 27 🥳💕 y quiero celebrarlo contigo.\n\n` +
      `Te dejo por aquí la invitación con todos los detalles. Espero que puedas acompañarme y pasar un rato chévere juntos. 🥂✨\n\n` +
      `Porfa, confírmame tu asistencia. 💌\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  rsvpMeta(status: RsvpStatus): RsvpMeta {
    return RSVP_META[status];
  }

  setStatusFilter(value: StatusFilter): void {
    this.statusFilter.set(value);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }

  private messageFromError(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
    return 'Ocurrió un error inesperado.';
  }
}
