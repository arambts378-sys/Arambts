import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const scannerSessionsService = {
  /**
   * Generates a secure raw token and its corresponding hash.
   */
  generateTokenPair: () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  },

  /**
   * Hashes a raw token for database lookup.
   */
  hashToken: (rawToken: string) => {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  },

  /**
   * Creates or reuses a scanner session for a given user and event.
   * If an active session exists, it returns a new token pair and updates the hash,
   * OR we can just return the raw token if we had it, but we don't store the raw token.
   * Since we cannot recover the raw token, any time we need to send an email,
   * we MUST regenerate the token and update the session's token_hash.
   */
  createOrRotateScannerSession: async (eventId: string, userId: string, expiresAt: Date) => {
    const adminClient = createAdminClient();
    const { rawToken, tokenHash } = scannerSessionsService.generateTokenPair();

    const { data: existing, error: findError } = await adminClient
      .from('volunteer_scanner_sessions')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existing) {
      // Rotate token for existing session
      const { data, error } = await adminClient
        .from('volunteer_scanner_sessions')
        .update({
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          last_used_at: null // reset usage if rotated
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      
      if (error) throw error;
      return { session: data, rawToken };
    } else {
      // Create new session
      const { data, error } = await adminClient
        .from('volunteer_scanner_sessions')
        .insert({
          event_id: eventId,
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString()
        })
        .select('*')
        .single();
      
      if (error) throw error;
      return { session: data, rawToken };
    }
  },

  /**
   * Revokes a scanner session.
   */
  revokeScannerSession: async (sessionId: string) => {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('volunteer_scanner_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId);
    
    if (error) throw error;
  },
  
  /**
   * Revoke all active sessions for a user in an event.
   */
  revokeUserSessionsForEvent: async (eventId: string, userId: string) => {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('volunteer_scanner_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .is('revoked_at', null);
      
    if (error) throw error;
  }
};
