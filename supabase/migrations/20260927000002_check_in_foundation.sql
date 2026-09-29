-- ==========================================
-- ARAM BTS Phase 3A: Check-in Foundation
-- ==========================================

-- 1. Insert new permissions for check-in
INSERT INTO public.permissions (id, name) VALUES 
  (gen_random_uuid(), 'checkin.view'),
  (gen_random_uuid(), 'checkin.scan'),
  (gen_random_uuid(), 'checkin.manage')
ON CONFLICT (name) DO NOTHING;

-- Map permissions to roles
-- workspace_owner gets all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner' AND p.name IN ('checkin.view', 'checkin.scan', 'checkin.manage')
ON CONFLICT DO NOTHING;

-- admin gets all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('checkin.view', 'checkin.scan', 'checkin.manage')
ON CONFLICT DO NOTHING;

-- editor gets view and scan
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('checkin.view', 'checkin.scan')
ON CONFLICT DO NOTHING;

-- member gets view and scan
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name IN ('checkin.view', 'checkin.scan')
ON CONFLICT DO NOTHING;

-- viewer gets view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name = 'checkin.view'
ON CONFLICT DO NOTHING;

-- 2. Create check_ins table
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    qr_credential_id UUID REFERENCES public.qr_credentials(id) ON DELETE SET NULL,
    access_zone_id UUID REFERENCES public.access_zones(id) ON DELETE SET NULL,
    scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    result TEXT NOT NULL CHECK (result IN ('allowed', 'denied')),
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for querying check-in history
CREATE INDEX idx_check_ins_event_id ON public.check_ins(event_id);
CREATE INDEX idx_check_ins_registration_id ON public.check_ins(registration_id);
CREATE INDEX idx_check_ins_zone_id ON public.check_ins(access_zone_id);

-- 3. Atomic RPC for Check-in Evaluation & Insertion
CREATE OR REPLACE FUNCTION public.process_check_in(
    p_qr_token_hash TEXT,
    p_zone_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_scanner_uid UUID;
    v_zone RECORD;
    v_event RECORD;
    v_credential RECORD;
    v_registration RECORD;
    v_has_scan_permission BOOLEAN;
    v_now TIMESTAMPTZ := now();
    v_manual_assignment RECORD;
    v_rules JSONB;
    v_rule RECORD;
    v_rule_matched BOOLEAN := FALSE;
    v_existing_allowed INT;
    v_prereq_zone_id UUID;
    v_prereq_passed BOOLEAN;
BEGIN
    -- 1. Identify Scanner via auth.uid()
    v_scanner_uid := auth.uid();
    IF v_scanner_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'Scanner is not authenticated.');
    END IF;

    -- 2. Validate Zone
    SELECT * INTO v_zone FROM access_zones WHERE id = p_zone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_not_found', 'message', 'The requested access zone does not exist.');
    END IF;

    -- 3. Verify Scanner Permissions for this Event's Workspace
    SELECT workspace_id INTO v_event FROM events WHERE id = v_zone.event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'event_not_found', 'message', 'The event for this zone does not exist.');
    END IF;

    v_has_scan_permission := public.has_permission(v_event.workspace_id, 'checkin.scan');
    IF NOT v_has_scan_permission THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        -- We don't have registration_id yet, so we can't insert a full check-in record for an unauthorized scanner scanning a random token if they don't even have permission to the workspace.
        -- We will just return denied.
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'You do not have permission to scan for this event.');
    END IF;

    -- 4. Validate QR Credential
    SELECT * INTO v_credential FROM qr_credentials WHERE credential_token_hash = p_qr_token_hash;
    IF NOT FOUND THEN
        -- We can't log event_id/registration_id if the QR is completely unknown, but we might know event_id from zone.
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
    END IF;

    IF v_credential.event_id != v_zone.event_id THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'wrong_event');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'wrong_event', 'message', 'This QR credential belongs to a different event.');
    END IF;

    IF v_credential.status != 'active' THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'qr_' || v_credential.status);
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_' || v_credential.status, 'message', 'This QR credential is ' || v_credential.status || '.');
    END IF;

    IF v_credential.expires_at IS NOT NULL AND v_credential.expires_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'qr_expired');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_expired', 'message', 'This QR credential has expired.');
    END IF;

    -- 5. Lock Registration for Concurrency Safety
    -- This strictly serializes concurrent scans for the same participant.
    SELECT * INTO v_registration FROM registrations WHERE id = v_credential.registration_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_found', 'message', 'Registration not found.');
    END IF;

    IF v_registration.status != 'confirmed' THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'registration_not_confirmed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_confirmed', 'message', 'Registration is not confirmed.');
    END IF;

    -- 6. Evaluate Zone State
    IF NOT v_zone.is_active THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'zone_inactive');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_inactive', 'message', 'This access zone is currently closed.');
    END IF;

    IF v_zone.starts_at IS NOT NULL AND v_zone.starts_at > v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has not opened yet.');
    END IF;

    IF v_zone.ends_at IS NOT NULL AND v_zone.ends_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has already closed.');
    END IF;

    -- 7. Evaluate Duplicate / Re-entry rule
    IF NOT v_zone.allow_reentry THEN
        SELECT COUNT(*) INTO v_existing_allowed FROM check_ins 
        WHERE registration_id = v_registration.id 
          AND access_zone_id = p_zone_id 
          AND result = 'allowed';

        IF v_existing_allowed > 0 THEN
            INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'already_checked_in');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'already_checked_in', 'message', 'Participant has already checked into this zone.');
        END IF;
    END IF;

    -- 8. Evaluate Manual Assignment
    SELECT * INTO v_manual_assignment FROM access_assignments 
    WHERE zone_id = p_zone_id AND registration_id = v_registration.id LIMIT 1;

    IF v_manual_assignment.id IS NOT NULL THEN
        v_rule_matched := TRUE;
    ELSE
        -- 9. Evaluate Access Rules
        FOR v_rule IN SELECT * FROM access_rules WHERE zone_id = p_zone_id AND is_active = true LOOP
            IF v_rule.rule_type = 'all_confirmed_attendees' THEN
                v_rule_matched := TRUE;
            END IF;
            
            -- Evaluate prerequisite rule
            IF v_rule.rule_type = 'prerequisite_zone' THEN
                v_prereq_zone_id := (v_rule.rule_value->>'zone_id')::UUID;
                IF v_prereq_zone_id IS NOT NULL THEN
                    SELECT EXISTS(
                        SELECT 1 FROM check_ins 
                        WHERE registration_id = v_registration.id 
                          AND access_zone_id = v_prereq_zone_id 
                          AND result = 'allowed'
                    ) INTO v_prereq_passed;

                    IF v_prereq_passed THEN
                        v_rule_matched := TRUE;
                    ELSE
                        -- Prerequisite failed, override matched to false if this is a strict requirement,
                        -- but for now, we evaluate as OR. Wait! If a prerequisite fails, should it DENY immediately, 
                        -- or just not match this rule? A prerequisite is typically an AND constraint or a specific rule match.
                        -- We will treat prerequisite as a rule that matches IF the prerequisite is met.
                        -- Since rules are OR, if it doesn't match, we continue checking other rules.
                        v_rule_matched := FALSE;
                    END IF;
                END IF;
            END IF;

            -- Future ticket type evaluation goes here

            EXIT WHEN v_rule_matched;
        END LOOP;
    END IF;

    IF NOT v_rule_matched THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'access_not_allowed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'access_not_allowed', 'message', 'No access rules permit entry for this participant.');
    END IF;

    -- 10. Record Successful Check-in
    INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
    VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'allowed', NULL);

    -- Fire and forget update on credential
    UPDATE qr_credentials SET last_used_at = v_now WHERE id = v_credential.id;

    RETURN jsonb_build_object('success', true, 'result', 'allowed', 'reason', null, 'message', 'Check-in successful.');
END;
$$;

-- 4. RLS Policies for Check_ins
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Allow reading check-ins if you have checkin.view on the workspace
CREATE POLICY "Enable read for event managers (check_ins)"
    ON public.check_ins FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'checkin.view'));

-- Do NOT create INSERT/UPDATE/DELETE policies for clients.
-- INSERT is performed by the SECURITY DEFINER RPC.
