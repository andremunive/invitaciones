export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

export interface Guest {
  id: string;
  name: string;
  token: string;
  seats: number;
  invitation_opened: boolean;
  invitation_opened_at: string | null;
  rsvp_status: RsvpStatus;
  responded_at: string | null;
  created_at: string;
}

export type NewGuest = Pick<Guest, 'name' | 'seats' | 'token'>;
