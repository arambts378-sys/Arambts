-- ==========================================
-- ARAM BTS: Scanner Sessions Redesign
-- ==========================================

-- 1. Drop old account-centric tables
DROP TABLE IF EXISTS public.volunteer_zone_assignments CASCADE;
DROP TABLE IF EXISTS public.event_staff_assignments CASCADE;

-- 2. Create volunteer_scanner_sessions
CREATE TABLE IF NOT EXISTS public.volunteer_scanner_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    volunteer_email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    allowed_scopes JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vss_token_hash ON public.volunteer_scanner_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_vss_event_id ON public.volunteer_scanner_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_vss_status ON public.volunteer_scanner_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vss_expires_at ON public.volunteer_scanner_sessions(expires_at);

-- 3. Create volunteer_scanner_zones
CREATE TABLE IF NOT EXISTS public.volunteer_scanner_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.volunteer_scanner_sessions(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES public.access_zones(id) ON DELETE CASCADE,
    UNIQUE(session_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_vsz_session_id ON public.volunteer_scanner_zones(session_id);

-- 4. Update check_ins
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS scanner_session_id UUID REFERENCES public.volunteer_scanner_sessions(id) ON DELETE SET NULL;

-- 5. RLS Policies
ALTER TABLE public.volunteer_scanner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_scanner_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for event managers (sessions)"
    ON public.volunteer_scanner_sessions FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.view'));

CREATE POLICY "Enable all for event managers (sessions)"
    ON public.volunteer_scanner_sessions FOR ALL
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.manage'));

CREATE POLICY "Enable read for event managers (zones)"
    ON public.volunteer_scanner_zones FOR SELECT
    USING (public.has_permission((
        SELECT e.workspace_id FROM public.events e
        JOIN public.volunteer_scanner_sessions s ON s.event_id = e.id
        WHERE s.id = session_id
    ), 'volunteers.view'));

CREATE POLICY "Enable all for event managers (zones)"
    ON public.volunteer_scanner_zones FOR ALL
    USING (public.has_permission((
        SELECT e.workspace_id FROM public.events e
        JOIN public.volunteer_scanner_sessions s ON s.event_id = e.id
        WHERE s.id = session_id
    ), 'volunteers.manage'));

-- 6. Update process_check_in RPC
CREATE OR REPLACE FUNCTION public.process_check_in(
    p_qr_token_hash TEXT,
    p_zone_id UUID,
    p_scanner_token_hash TEXT DEFAULT NULL
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
    v_scanner_session RECORD;
    v_scanner_session_id UUID := NULL;
    v_manual_assignment RECORD;
    v_rules JSONB;
    v_rule RECORD;
    v_rule_matched BOOLEAN := FALSE;
    v_existing_allowed INT;
    v_prereq_zone_id UUID;
    v_prereq_passed BOOLEAN;
    v_distance_rule_found BOOLEAN := FALSE;
    v_distance_rule_passed BOOLEAN := FALSE;
    v_allowed_distances JSONB;
    v_session_allowed_distances JSONB;
BEGIN
    -- 1. Validate Zone
    SELECT * INTO v_zone FROM public.access_zones WHERE id = p_zone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_not_found', 'message', 'The requested access zone does not exist.');
    END IF;

    -- 2. Verify Event
    SELECT workspace_id INTO v_event FROM public.events WHERE id = v_zone.event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'event_not_found', 'message', 'The event for this zone does not exist.');
    END IF;

    -- 3. Scanner Authentication / Authorization
    IF p_scanner_token_hash IS NOT NULL THEN
        -- A. Token-Based Unauthenticated Scanner Flow
        SELECT * INTO v_scanner_session FROM public.volunteer_scanner_sessions 
        WHERE token_hash = p_scanner_token_hash;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_scanner_token', 'message', 'Scanner access is no longer valid.');
        END IF;
        
        v_scanner_session_id := v_scanner_session_id;

        IF v_scanner_session.status = 'revoked' THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'revoked_scanner_token', 'message', 'Scanner access has been revoked.');
        END IF;

        IF v_scanner_session.expires_at < v_now THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'expired_scanner_token', 'message', 'Scanner access has expired.');
        END IF;

        IF v_scanner_session.event_id != v_zone.event_id THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'wrong_event_scanner_token', 'message', 'Scanner access is not authorized for this event.');
        END IF;

        -- Verify Zone Assignment for Session
        IF NOT EXISTS (
            SELECT 1 FROM public.volunteer_scanner_zones 
            WHERE session_id = v_scanner_session_id AND zone_id = p_zone_id
        ) THEN
            INSERT INTO public.check_ins (event_id, registration_id, access_zone_id, scanner_session_id, result, reason)
            VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_session_id, 'denied', 'unauthorized_zone');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'You are not assigned to scan this zone.');
        END IF;

        -- Update last used timestamp statically here or at the end
        UPDATE public.volunteer_scanner_sessions SET last_used_at = v_now WHERE id = v_scanner_session_id;

    ELSE
        -- B. Authenticated User Flow
        v_scanner_uid := auth.uid();
        IF v_scanner_uid IS NULL THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'Scanner is not authenticated.');
        END IF;

        v_has_scan_permission := public.has_permission(v_event.workspace_id, 'checkin.scan');
        IF NOT v_has_scan_permission THEN
            INSERT INTO public.check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'You do not have permission to scan for this event.');
        END IF;
    END IF;

    -- 4. Validate QR Credential (ONLY IF REQUIRED)
    IF v_zone.requires_qr THEN
        SELECT * INTO v_credential FROM public.qr_credentials WHERE credential_token_hash = p_qr_token_hash;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
        END IF;

        IF v_credential.event_id != v_zone.event_id THEN
            INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
            VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'wrong_event');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'wrong_event', 'message', 'This QR credential belongs to a different event.');
        END IF;

        IF v_credential.status != 'active' THEN
            INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
            VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'qr_' || v_credential.status);
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_' || v_credential.status, 'message', 'This QR credential is ' || v_credential.status || '.');
        END IF;

        IF v_credential.expires_at IS NOT NULL AND v_credential.expires_at < v_now THEN
            INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
            VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'qr_expired');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_expired', 'message', 'This QR credential has expired.');
        END IF;
        
        -- Lock Registration for Concurrency Safety
        SELECT * INTO v_registration FROM public.registrations WHERE id = v_credential.registration_id FOR UPDATE;
    ELSE
        -- If QR is not required, look up registration differently (assuming generic token match)
        SELECT * INTO v_credential FROM public.qr_credentials WHERE credential_token_hash = p_qr_token_hash;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
        END IF;
        SELECT * INTO v_registration FROM public.registrations WHERE id = v_credential.registration_id FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_found', 'message', 'Registration not found.');
    END IF;

    IF v_registration.status != 'confirmed' THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'registration_not_confirmed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_confirmed', 'message', 'Registration is not confirmed.');
    END IF;

    -- 5. Scanner Allowed Distance Scope Check
    IF v_scanner_session_id IS NOT NULL AND v_registration.distance_category_id IS NOT NULL THEN
        v_session_allowed_distances := v_scanner_session.allowed_scopes->'distance_category_ids';
        IF v_session_allowed_distances IS NOT NULL THEN
            IF NOT v_session_allowed_distances @> to_jsonb(v_registration.distance_category_id::text) THEN
                INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
                VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'unauthorized_participant_scope');
                RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_participant_scope', 'message', 'Scanner is not authorized to scan this participant category.');
            END IF;
        END IF;
    END IF;

    -- 6. Evaluate Zone State
    IF NOT v_zone.is_active THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'zone_inactive');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_inactive', 'message', 'This access zone is currently closed.');
    END IF;

    IF v_zone.starts_at IS NOT NULL AND v_zone.starts_at > v_now THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has not opened yet.');
    END IF;

    IF v_zone.ends_at IS NOT NULL AND v_zone.ends_at < v_now THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has already closed.');
    END IF;

    -- 7. Evaluate Duplicate / Re-entry / Entitlement rules
    SELECT COUNT(*) INTO v_existing_allowed FROM public.check_ins 
    WHERE registration_id = v_registration.id 
      AND access_zone_id = p_zone_id 
      AND result = 'allowed';

    IF v_zone.entitlement_limit IS NOT NULL THEN
        IF v_existing_allowed >= v_zone.entitlement_limit THEN
            INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
            VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'entitlement_exhausted');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'entitlement_exhausted', 'message', 'Participant has exhausted their entitlement for this zone.');
        END IF;
    ELSE
        IF NOT v_zone.allow_reentry THEN
            IF v_existing_allowed > 0 THEN
                INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
                VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'already_checked_in');
                RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'already_checked_in', 'message', 'Participant has already checked into this zone.');
            END IF;
        END IF;
    END IF;

    -- 8. Evaluate Manual Assignment
    SELECT * INTO v_manual_assignment FROM public.access_assignments 
    WHERE zone_id = p_zone_id AND registration_id = v_registration.id LIMIT 1;

    IF v_manual_assignment.id IS NOT NULL THEN
        v_rule_matched := TRUE;
    ELSE
        -- 9. Evaluate Access Rules
        FOR v_rule IN SELECT * FROM public.access_rules WHERE zone_id = p_zone_id AND is_active = true LOOP
            IF v_rule.rule_type = 'all_confirmed_attendees' THEN
                v_rule_matched := TRUE;
            END IF;
            
            -- Walkathon distance category rule evaluation
            IF v_rule.rule_type = 'walkathon_distance' THEN
                v_distance_rule_found := TRUE;
                v_allowed_distances := v_rule.rule_value->'distance_category_ids';
                
                IF v_registration.distance_category_id IS NOT NULL AND v_allowed_distances IS NOT NULL THEN
                    IF v_allowed_distances @> to_jsonb(v_registration.distance_category_id::text) THEN
                        v_distance_rule_passed := TRUE;
                        v_rule_matched := TRUE;
                    END IF;
                END IF;
            END IF;

            -- Evaluate prerequisite rule
            IF v_rule.rule_type = 'prerequisite_zone' THEN
                v_prereq_zone_id := (v_rule.rule_value->>'zone_id')::UUID;
                IF v_prereq_zone_id IS NOT NULL THEN
                    SELECT EXISTS(
                        SELECT 1 FROM public.check_ins 
                        WHERE registration_id = v_registration.id 
                          AND access_zone_id = v_prereq_zone_id 
                          AND result = 'allowed'
                    ) INTO v_prereq_passed;

                    IF v_prereq_passed THEN
                        v_rule_matched := TRUE;
                    ELSE
                        -- Prerequisite failed. Explicitly deny and EXIT.
                        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
                        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'prerequisite_not_met');
                        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'prerequisite_not_met', 'message', 'Participant has not completed prerequisite checkpoint.');
                    END IF;
                END IF;
            END IF;

        END LOOP;
    END IF;

    -- If a distance rule exists, but the user didn't pass it, they are explicitly denied.
    IF v_distance_rule_found AND NOT v_distance_rule_passed THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'distance_not_authorized');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'distance_not_authorized', 'message', 'Participant distance category is not authorized for this checkpoint.');
    END IF;

    IF NOT v_rule_matched AND NOT v_distance_rule_found THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'denied', 'access_not_allowed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'access_not_allowed', 'message', 'No access rules permit entry for this participant.');
    END IF;

    -- 10. Record Successful Check-in
    INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
    VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session_id, 'allowed', NULL);

    UPDATE public.qr_credentials SET last_used_at = v_now WHERE id = v_credential.id;

    RETURN jsonb_build_object('success', true, 'result', 'allowed', 'reason', null, 'message', 'Check-in successful.');
END;
$$;
