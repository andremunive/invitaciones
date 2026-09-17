import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _client?: SupabaseClient;

  get client(): SupabaseClient {
    if (!this._client) {
      this._client = createClient(
        environment.supabase.url,
        environment.supabase.publishableKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      );
    }
    return this._client;
  }
}
