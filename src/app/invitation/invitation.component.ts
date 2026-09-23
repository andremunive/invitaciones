import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { GuestsService } from '../core/guests/guests.service';
import { Guest } from '../core/guests/guest.model';

@Component({
  selector: 'app-invitation',
  standalone: true,
  imports: [],
  templateUrl: './invitation.component.html',
  styleUrl: './invitation.component.scss',
})
export class InvitationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly guestsService = inject(GuestsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly event = environment.event;

  readonly guest = signal<Guest | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly envelopeOpen = signal(false);
  readonly responding = signal(false);
  readonly respondError = signal<string | null>(null);
  readonly mapPickerOpen = signal(false);

  readonly seatsLabel = computed(() => {
    const g = this.guest();
    if (!g) return '';
    return g.seats === 1 ? '1 cupo' : `${g.seats} cupos`;
  });

  readonly googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${this.event.venueLat},${this.event.venueLng}`;
  readonly wazeUrl = `https://waze.com/ul?ll=${this.event.venueLat},${this.event.venueLng}&navigate=yes`;

  constructor() {
    if (this.isBrowser) void this.load();
  }

  private async load(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    try {
      const guest = await this.guestsService.getByToken(token);
      if (!guest) this.notFound.set(true);
      else this.guest.set(guest);
    } catch (e) {
      this.loadError.set(this.messageFromError(e));
    } finally {
      this.loading.set(false);
    }
  }

  openEnvelope(): void {
    if (this.envelopeOpen()) return;
    this.envelopeOpen.set(true);
    const g = this.guest();
    if (g && !g.invitation_opened) {
      void this.guestsService.markOpened(g.token).catch(() => undefined);
    }
  }

  openMapPicker(): void {
    this.mapPickerOpen.set(true);
  }

  closeMapPicker(): void {
    this.mapPickerOpen.set(false);
  }

  async respond(status: 'confirmed' | 'declined'): Promise<void> {
    const current = this.guest();
    if (!current || current.rsvp_status !== 'pending') return;
    this.responding.set(true);
    this.respondError.set(null);
    try {
      const updated = await this.guestsService.respond(current.token, status);
      this.guest.set(updated);
    } catch (e) {
      this.respondError.set(this.messageFromError(e));
    } finally {
      this.responding.set(false);
    }
  }

  private messageFromError(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
    return 'Ocurrió un error inesperado.';
  }
}
