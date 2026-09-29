-- ==========================================
-- ARAM BTS: Invitation Redemption RPC
-- ==========================================

CREATE OR REPLACE FUNCTION public.redeem_invitation(
    p_token UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_uid UUID;
    v_user_email TEXT;
    v_invitation RECORD;
    v_event_id UUID;
    v_zone_id TEXT; -- for iterating
    v_starts_at TIMESTAMPTZ;
    v_ends_at TIMESTAMPTZ;
BEGIN
    -- 1. Identify User
    v_user_uid := auth.uid();
    IF v_user_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be logged in to redeem an invitation.');
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_uid;

    -- 2. Validate Invitation
    SELECT * INTO v_invitation FROM workspace_invitations WHERE token = p_token FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid invitation link.');
    END IF;

    IF v_invitation.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This invitation has already been ' || v_invitation.status || '.');
    END IF;

    IF v_invitation.expires_at < now() THEN
        UPDATE workspace_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN jsonb_build_object('success', false, 'message', 'This invitation has expired.');
    END IF;

    IF v_invitation.email != v_user_email THEN
        -- Allow redemption if the user logged in with a different email? No, strictly enforce email matching.
        -- RETURN jsonb_build_object('success', false, 'message', 'This invitation was sent to a different email address.');
        -- Wait, the prompt says "verify invitation email... where appropriate". Usually strict email match is good.
        IF v_user_email IS NOT NULL AND v_invitation.email != v_user_email THEN
            RETURN jsonb_build_object('success', false, 'message', 'This invitation belongs to ' || v_invitation.email || '. Please sign in with that account.');
        END IF;
    END IF;

    -- 3. Create or Confirm Workspace Membership
    INSERT INTO workspace_members (workspace_id, user_id, role_id)
    VALUES (v_invitation.workspace_id, v_user_uid, v_invitation.role_id)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    -- 4. Create Event Staff Assignments
    v_event_id := (v_invitation.metadata->>'event_id')::UUID;
    v_starts_at := (v_invitation.metadata->>'starts_at')::TIMESTAMPTZ;
    v_ends_at := (v_invitation.metadata->>'ends_at')::TIMESTAMPTZ;

    IF v_event_id IS NOT NULL THEN
        -- Ensure the user actually gets assigned to all zones in metadata
        FOR v_zone_id IN SELECT jsonb_array_elements_text(v_invitation.metadata->'assigned_zones') LOOP
            INSERT INTO event_staff_assignments (event_id, user_id, access_zone_id, active, starts_at, ends_at)
            VALUES (v_event_id, v_user_uid, v_zone_id::UUID, true, v_starts_at, v_ends_at)
            ON CONFLICT (event_id, user_id, access_zone_id) 
            DO UPDATE SET active = true, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at;
        END LOOP;
    END IF;

    -- 5. Mark Invitation Accepted
    UPDATE workspace_invitations SET status = 'accepted' WHERE id = v_invitation.id;

    RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'message', 'Invitation redeemed successfully.');
END;
$$;
