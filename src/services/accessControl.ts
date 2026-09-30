import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Access Control Service
 * Handles Access Zones, Rules, Assignments, and the core Evaluation engine.
 */

export const accessControlService = {
  
  // ==========================================
  // ZONES
  // ==========================================

  async getAccessZones(eventId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('access_zones')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
      
    if (error) throw new Error('Failed to get access zones: ' + error.message);
    return data;
  },

  async createAccessZone(eventId: string, zoneData: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('access_zones')
      .insert({ event_id: eventId, ...zoneData })
      .select('*')
      .single();

    if (error) throw new Error('Failed to create zone: ' + error.message);
    return data;
  },

  async updateAccessZone(zoneId: string, updates: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('access_zones')
      .update(updates)
      .eq('id', zoneId)
      .select('*')
      .single();

    if (error) throw new Error('Failed to update zone: ' + error.message);
    return data;
  },

  async deactivateAccessZone(zoneId: string) {
    return this.updateAccessZone(zoneId, { is_active: false });
  },

  // ==========================================
  // RULES
  // ==========================================

  async getAccessRules(zoneId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('access_rules')
      .select('*')
      .eq('zone_id', zoneId);
      
    if (error) throw new Error('Failed to get access rules: ' + error.message);
    return data;
  },

  async createAccessRule(zoneId: string, ruleType: string, ruleValue: any = {}) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('access_rules')
      .insert({ zone_id: zoneId, rule_type: ruleType, rule_value: ruleValue })
      .select('*')
      .single();

    if (error) throw new Error('Failed to create access rule: ' + error.message);
    return data;
  },

  async deleteAccessRule(ruleId: string) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('access_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw new Error('Failed to delete access rule: ' + error.message);
    return true;
  },

  // ==========================================
  // ASSIGNMENTS
  // ==========================================

  async getZoneAssignments(zoneId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('access_assignments')
      .select(`
        *,
        registrations (
          id,
          registration_number,
          status,
          event_people (
            people (
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('zone_id', zoneId);

    if (error) throw new Error('Failed to get assignments: ' + error.message);
    return data;
  },

  async assignAttendeeToZone(zoneId: string, registrationId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('access_assignments')
      .insert({ zone_id: zoneId, registration_id: registrationId })
      .select('*')
      .single();

    if (error) throw new Error('Failed to assign attendee: ' + error.message);
    return data;
  },

  async removeAttendeeFromZone(zoneId: string, registrationId: string) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('access_assignments')
      .delete()
      .eq('zone_id', zoneId)
      .eq('registration_id', registrationId);

    if (error) throw new Error('Failed to remove attendee: ' + error.message);
    return true;
  },

  // ==========================================
  // CORE EVALUATION ENGINE
  // ==========================================

  /**
   * Evaluates if a given registration is allowed to enter a given zone.
   * This is the server-side decision engine for the future Check-in Scanner.
   */
  async evaluateAccess(registrationId: string, zoneId: string) {
    const supabase = await createClient();
    
    // 1. Fetch Zone and Registration
    const [zoneRes, regRes] = await Promise.all([
      supabase.from('access_zones').select('*').eq('id', zoneId).single(),
      supabase.from('registrations').select('status, event_id').eq('id', registrationId).single()
    ]);

    if (zoneRes.error || !zoneRes.data) return { allowed: false, reason: 'Zone not found' };
    if (regRes.error || !regRes.data) return { allowed: false, reason: 'Registration not found' };
    
    const zone = zoneRes.data;
    const reg = regRes.data;

    if (zone.event_id !== reg.event_id) return { allowed: false, reason: 'Cross-event validation denied' };
    if (!zone.is_active) return { allowed: false, reason: 'Zone is currently closed/inactive' };
    if (reg.status !== 'confirmed') return { allowed: false, reason: `Registration is ${reg.status}` };

    // 2. Check Schedule Constraints
    const now = new Date();
    if (zone.starts_at && new Date(zone.starts_at) > now) {
      return { allowed: false, reason: 'Zone has not opened yet' };
    }
    if (zone.ends_at && new Date(zone.ends_at) < now) {
      return { allowed: false, reason: 'Zone has already closed' };
    }

    // 3. Evaluate Manual Assignments first (explicit Allow)
    const { data: assignment } = await supabase
      .from('access_assignments')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('registration_id', registrationId)
      .single();

    if (assignment) {
      return { allowed: true, reason: 'Manual assignment granted' };
    }

    // 4. Fetch Rules for this Zone
    const { data: rules } = await supabase
      .from('access_rules')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true);

    if (!rules || rules.length === 0) {
      // If there are no rules and no manual assignment, deny by default
      return { allowed: false, reason: 'No access rule permits entry' };
    }

    // 5. Evaluate Rules (Logical OR - if any rule passes, allow access)
    for (const rule of rules) {
      if (rule.rule_type === 'all_confirmed_attendees') {
        return { allowed: true, reason: 'Zone allows all confirmed attendees' };
      }
      // Add ticket_type logic or attendee_type logic here later
      if (rule.rule_type === 'vip_ticket_holders') {
         // evaluate VIP ticket status...
      }
    }

    // Default deny if no rule matches
    return { allowed: false, reason: 'Access denied by zone rules' };
  },

  /**
   * Handles the secure check-in flow by calling the atomic process_check_in PostgreSQL RPC.
   * This guarantees race-condition safety and authoritative server-side execution.
   */
  async evaluateCheckInAccess(rawToken: string, zoneId: string, scannerToken: string | null = null) {
    const supabase = await createClient();
    
    // Hash the attendee QR token (trim to ensure no scanner whitespace corrupts the hash)
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    // Hash the scanner session token if provided
    let scannerTokenHash = null;
    if (scannerToken) {
      scannerTokenHash = crypto.createHash('sha256').update(scannerToken).digest('hex');
    }

    const params: any = {
      p_qr_token_hash: tokenHash,
      p_zone_id: zoneId
    };
    
    if (scannerTokenHash) {
      params.p_scanner_token_hash = scannerTokenHash;
    }

    const { data, error } = await supabase.rpc('process_check_in', params);

    if (error) {
      console.error('Check-in RPC error:', error);
      throw new Error('Internal database error during check-in');
    }

    return data as {
      success: boolean;
      result: 'allowed' | 'denied';
      reason: string | null;
      message: string;
    };
  }

};
