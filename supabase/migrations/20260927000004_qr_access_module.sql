-- ==========================================
-- ARAM BTS QR & Access Module Schema Updates
-- ==========================================

-- 1. Extend access_zones
ALTER TABLE public.access_zones
ADD COLUMN requires_qr BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN entitlement_limit INTEGER,
ADD COLUMN entitlement_unit TEXT;

ALTER TABLE public.access_zones
ADD CONSTRAINT chk_entitlement_limit CHECK (entitlement_limit IS NULL OR entitlement_limit > 0);

-- 2. Create workspace_invitations table
CREATE TABLE public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

CREATE INDEX idx_workspace_invitations_workspace_id ON public.workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_status ON public.workspace_invitations(status);
CREATE INDEX idx_workspace_invitations_expires_at ON public.workspace_invitations(expires_at);

-- RLS for workspace_invitations
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for workspace managers (invitations)"
    ON public.workspace_invitations FOR SELECT
    USING (public.has_permission(workspace_id, 'volunteers.view'));

CREATE POLICY "Enable insert for workspace managers (invitations)"
    ON public.workspace_invitations FOR INSERT
    WITH CHECK (public.has_permission(workspace_id, 'volunteers.manage'));

CREATE POLICY "Enable update for workspace managers (invitations)"
    ON public.workspace_invitations FOR UPDATE
    USING (public.has_permission(workspace_id, 'volunteers.manage'));


-- 3. Update process_check_in RPC to enforce entitlement limit
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
    v_staff_assignment RECORD;
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
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'You do not have permission to scan for this event.');
    END IF;

    -- 3B. Verify Scanner Checkpoint Assignment (PHASE 3C logic)
    SELECT * INTO v_staff_assignment FROM event_staff_assignments 
    WHERE event_id = v_zone.event_id 
      AND user_id = v_scanner_uid 
      AND access_zone_id = p_zone_id 
      AND active = true;

    IF NOT FOUND THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'You are not assigned to this checkpoint.');
    END IF;

    -- Validate assignment time window
    IF v_staff_assignment.starts_at IS NOT NULL AND v_staff_assignment.starts_at > v_now THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'Your assignment for this checkpoint has not started yet.');
    END IF;

    IF v_staff_assignment.ends_at IS NOT NULL AND v_staff_assignment.ends_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'Your assignment for this checkpoint has ended.');
    END IF;


    -- 4. Validate QR Credential (ONLY IF REQUIRED)
    IF v_zone.requires_qr THEN
        SELECT * INTO v_credential FROM qr_credentials WHERE credential_token_hash = p_qr_token_hash;
        IF NOT FOUND THEN
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
        SELECT * INTO v_registration FROM registrations WHERE id = v_credential.registration_id FOR UPDATE;
    ELSE
        -- If QR is not required, we would look up registration differently. 
        -- However, currently the process_check_in requires a p_qr_token_hash to identify the registration.
        -- If requires_qr is false but we passed a hash, we just proceed as normal.
        SELECT * INTO v_credential FROM qr_credentials WHERE credential_token_hash = p_qr_token_hash;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
        END IF;
        SELECT * INTO v_registration FROM registrations WHERE id = v_credential.registration_id FOR UPDATE;
    END IF;

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

    -- 7. Evaluate Duplicate / Re-entry / Entitlement Limit rules
    SELECT COUNT(*) INTO v_existing_allowed FROM check_ins 
    WHERE registration_id = v_registration.id 
      AND access_zone_id = p_zone_id 
      AND result = 'allowed';

    IF v_zone.entitlement_limit IS NOT NULL THEN
        IF v_existing_allowed >= v_zone.entitlement_limit THEN
            INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'entitlement_exhausted');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'entitlement_exhausted', 'message', 'Participant has exhausted their entitlement for this zone.');
        END IF;
    ELSE
        -- Original re-entry logic when no limit is defined
        IF NOT v_zone.allow_reentry THEN
            IF v_existing_allowed > 0 THEN
                INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
                VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'already_checked_in');
                RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'already_checked_in', 'message', 'Participant has already checked into this zone.');
            END IF;
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
                        v_rule_matched := FALSE;
                    END IF;
                END IF;
            END IF;

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

    UPDATE qr_credentials SET last_used_at = v_now WHERE id = v_credential.id;

    RETURN jsonb_build_object('success', true, 'result', 'allowed', 'reason', null, 'message', 'Check-in successful.');
END;
$$;
