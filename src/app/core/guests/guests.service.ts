import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { Guest, RsvpStatus } from './guest.model';

const TABLE = 'guests';

@Injectable({ providedIn: 'root' })
export class GuestsService {
  private readonly supabase = inject(SupabaseService);

  async list(): Promise<Guest[]> {
    const { data, error } = await this.supabase.client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Guest[];
  }

  async getByToken(token: string): Promise<Guest | null> {
    const { data, error } = await this.supabase.client
      .from(TABLE)
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    return data as Guest | null;
  }

  async create(name: string, seats: number): Promise<Guest> {
    const token = generateToken();
    const { data, error } = await this.supabase.client
      .from(TABLE)
      .insert({ name, seats, token })
      .select('*')
      .single();
    if (error) throw error;
    return data as Guest;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }

  async markOpened(token: string): Promise<void> {
    const { error } = await this.supabase.client
      .from(TABLE)
      .update({ invitation_opened: true, invitation_opened_at: new Date().toISOString() })
      .eq('token', token)
      .eq('invitation_opened', false);
    if (error) throw error;
  }

  async respond(token: string, status: Exclude<RsvpStatus, 'pending'>): Promise<Guest> {
    const { data, error } = await this.supabase.client
      .from(TABLE)
      .update({ rsvp_status: status, responded_at: new Date().toISOString() })
      .eq('token', token)
      .select('*')
      .single();
    if (error) throw error;
    return data as Guest;
  }
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}
