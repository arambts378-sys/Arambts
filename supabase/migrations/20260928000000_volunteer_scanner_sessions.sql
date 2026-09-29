-- ==========================================
-- ARAM BTS Phase 3D: Volunteer Scanner Sessions
-- ==========================================

-- 1. Create volunteer_scanner_sessions table
CREATE TABLE IF NOT EXISTS public.volunteer_scanner_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteer_scanner_sessions_active_unique 
ON public.volunteer_scanner_sessions(event_id, user_id) 
WHERE (revoked_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_volunteer_scanner_sessions_hash ON public.volunteer_scanner_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_volunteer_scanner_sessions_event_user ON public.volunteer_scanner_sessions(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_scanner_sessions_expires ON public.volunteer_scanner_sessions(expires_at);

-- 2. Modify check_ins table
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS scanner_session_id UUID REFERENCES public.volunteer_scanner_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS staff_assignment_id UUID REFERENCES public.event_staff_assignments(id) ON DELETE SET NULL;

-- 3. RLS for volunteer_scanner_sessions
ALTER TABLE public.volunteer_scanner_sessions ENABLE ROW LEVEL SECURITY;

-- Allow reading sessions for event organizers or the assigned volunteer
CREATE POLICY "Enable read for event volunteers (volunteer_scanner_sessions)"
    ON public.volunteer_scanner_sessions FOR SELECT
    USING (
        public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.view')
        OR
        user_id = auth.uid()
    );

-- Allow insert/update for event managers
CREATE POLICY "Enable insert for event managers (volunteer_scanner_sessions)"
    ON public.volunteer_scanner_sessions FOR INSERT
    WITH CHECK (
        public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.manage')
    );

CREATE POLICY "Enable update for event managers (volunteer_scanner_sessions)"
    ON public.volunteer_scanner_sessions FOR UPDATE
    USING (
        public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.manage')
    );


-- 4. Update process_check_in RPC to support token-based authentication
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
    v_staff_assignment RECORD;
    v_scanner_session RECORD;
    v_manual_assignment RECORD;
    v_rules JSONB;
    v_rule RECORD;
    v_rule_matched BOOLEAN := FALSE;
    v_existing_allowed INT;
    v_prereq_zone_id UUID;
    v_prereq_passed BOOLEAN;
BEGIN
    -- 1. Validate Zone
    SELECT * INTO v_zone FROM access_zones WHERE id = p_zone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_not_found', 'message', 'The requested access zone does not exist.');
    END IF;

    -- 2. Verify Event
    SELECT workspace_id INTO v_event FROM events WHERE id = v_zone.event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'event_not_found', 'message', 'The event for this zone does not exist.');
    END IF;

    -- 3. Scanner Authentication / Authorization
    IF p_scanner_token_hash IS NOT NULL THEN
        -- A. Token-Based Operational Scanner Flow
        SELECT * INTO v_scanner_session FROM volunteer_scanner_sessions 
        WHERE token_hash = p_scanner_token_hash;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_scanner_token', 'message', 'Scanner access is no longer valid.');
        END IF;

        IF v_scanner_session.revoked_at IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'revoked_scanner_token', 'message', 'Scanner access is no longer valid.');
        END IF;

        IF v_scanner_session.expires_at < v_now THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'expired_scanner_token', 'message', 'Scanner access has expired.');
        END IF;

        IF v_scanner_session.event_id != v_zone.event_id THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'wrong_event_scanner_token', 'message', 'Scanner access is no longer valid.');
        END IF;

        v_scanner_uid := v_scanner_session.user_id;

        -- Verify Scanner Checkpoint Assignment for token user
        SELECT * INTO v_staff_assignment FROM event_staff_assignments 
        WHERE event_id = v_zone.event_id 
          AND user_id = v_scanner_uid 
          AND access_zone_id = p_zone_id 
          AND active = true;

        IF NOT FOUND THEN
            INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, scanner_session_id, result, reason)
            VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, v_scanner_session.id, 'denied', 'unauthorized_zone');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'You are not assigned to this checkpoint.');
        END IF;

        -- Update last used timestamp stat
        UPDATE volunteer_scanner_sessions SET last_used_at = v_now WHERE id = v_scanner_session.id;

    ELSE
        -- B. Authenticated User Flow
        v_scanner_uid := auth.uid();
        IF v_scanner_uid IS NULL THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'Scanner is not authenticated.');
        END IF;

        v_has_scan_permission := public.has_permission(v_event.workspace_id, 'checkin.scan');
        IF NOT v_has_scan_permission THEN
            INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'You do not have permission to scan for this event.');
        END IF;

        -- Verify Scanner Checkpoint Assignment for authenticated user
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
    END IF;

    -- Validate assignment time window (Applies to BOTH flows as long as v_staff_assignment is populated)
    IF v_staff_assignment.starts_at IS NOT NULL AND v_staff_assignment.starts_at > v_now THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'Your assignment for this checkpoint has not started yet.');
    END IF;

    IF v_staff_assignment.ends_at IS NOT NULL AND v_staff_assignment.ends_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'Your assignment for this checkpoint has ended.');
    END IF;

    -- 4. Validate QR Credential
    SELECT * INTO v_credential FROM qr_credentials WHERE credential_token_hash = p_qr_token_hash;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
    END IF;

    IF v_credential.event_id != v_zone.event_id THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'wrong_event');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'wrong_event', 'message', 'This QR credential belongs to a different event.');
    END IF;

    IF v_credential.status != 'active' THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'qr_' || v_credential.status);
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_' || v_credential.status, 'message', 'This QR credential is ' || v_credential.status || '.');
    END IF;

    IF v_credential.expires_at IS NOT NULL AND v_credential.expires_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'qr_expired');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_expired', 'message', 'This QR credential has expired.');
    END IF;

    -- 5. Lock Registration for Concurrency Safety
    SELECT * INTO v_registration FROM registrations WHERE id = v_credential.registration_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_found', 'message', 'Registration not found.');
    END IF;

    IF v_registration.status != 'confirmed' THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'registration_not_confirmed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_confirmed', 'message', 'Registration is not confirmed.');
    END IF;

    -- 6. Evaluate Zone State
    IF NOT v_zone.is_active THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'zone_inactive');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_inactive', 'message', 'This access zone is currently closed.');
    END IF;

    IF v_zone.starts_at IS NOT NULL AND v_zone.starts_at > v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has not opened yet.');
    END IF;

    IF v_zone.ends_at IS NOT NULL AND v_zone.ends_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has already closed.');
    END IF;

    -- 7. Evaluate Duplicate / Re-entry rule
    IF NOT v_zone.allow_reentry THEN
        SELECT COUNT(*) INTO v_existing_allowed FROM check_ins 
        WHERE registration_id = v_registration.id 
          AND access_zone_id = p_zone_id 
          AND result = 'allowed';

        IF v_existing_allowed > 0 THEN
            INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
            VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'already_checked_in');
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
                        v_rule_matched := FALSE;
                    END IF;
                END IF;
            END IF;

            EXIT WHEN v_rule_matched;
        END LOOP;
    END IF;

    IF NOT v_rule_matched THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'denied', 'access_not_allowed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'access_not_allowed', 'message', 'No access rules permit entry for this participant.');
    END IF;

    -- 10. Record Successful Check-in
    INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, scanner_session_id, staff_assignment_id, result, reason)
    VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, v_scanner_session.id, v_staff_assignment.id, 'allowed', NULL);

    UPDATE qr_credentials SET last_used_at = v_now WHERE id = v_credential.id;

    RETURN jsonb_build_object('success', true, 'result', 'allowed', 'reason', null, 'message', 'Check-in successful.');
END;
$$;
