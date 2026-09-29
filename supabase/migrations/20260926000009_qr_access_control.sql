-- ==========================================
-- ARAM BTS QR Credential & Access Control
-- ==========================================

-- 1. Create QR Credentials Table
CREATE TABLE IF NOT EXISTS qr_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    credential_token_hash TEXT NOT NULL,
    credential_prefix TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'suspended')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one active credential per registration
CREATE UNIQUE INDEX idx_qr_credentials_active_registration 
ON qr_credentials (registration_id) 
WHERE status = 'active';

-- Indexes for efficient lookup
CREATE INDEX idx_qr_credentials_event_id ON qr_credentials(event_id);
CREATE INDEX idx_qr_credentials_token_hash ON qr_credentials(credential_token_hash);
CREATE INDEX idx_qr_credentials_status ON qr_credentials(status);

-- 2. Create Access Zones Table
CREATE TABLE IF NOT EXISTS access_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    zone_type TEXT NOT NULL,
    description TEXT,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_reentry BOOLEAN NOT NULL DEFAULT false,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_zones_event_id ON access_zones(event_id);
CREATE INDEX idx_access_zones_is_active ON access_zones(is_active);

-- 3. Create Access Rules Table
CREATE TABLE IF NOT EXISTS access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES access_zones(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    rule_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_rules_zone_id ON access_rules(zone_id);
CREATE INDEX idx_access_rules_is_active ON access_rules(is_active);

-- 4. Create Access Assignments Table (Manual assignments)
CREATE TABLE IF NOT EXISTS access_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES access_zones(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate active manual assignments for the same zone/registration
CREATE UNIQUE INDEX idx_access_assignments_zone_registration 
ON access_assignments (zone_id, registration_id);

CREATE INDEX idx_access_assignments_registration_id ON access_assignments(registration_id);

-- ==========================================
-- Triggers for updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_qr_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qr_credentials_timestamp
    BEFORE UPDATE ON qr_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_credentials_updated_at();

CREATE OR REPLACE FUNCTION update_access_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_access_zones_timestamp
    BEFORE UPDATE ON access_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_access_zones_updated_at();

CREATE OR REPLACE FUNCTION update_access_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_access_rules_timestamp
    BEFORE UPDATE ON access_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_access_rules_updated_at();

-- ==========================================
-- Row Level Security (RLS)
-- ==========================================

ALTER TABLE qr_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_assignments ENABLE ROW LEVEL SECURITY;

-- 1. QR Credentials RLS
CREATE POLICY "Enable read for event organizers (QR)"
    ON qr_credentials FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.view'));

CREATE POLICY "Enable insert for event managers (QR)"
    ON qr_credentials FOR INSERT
    WITH CHECK (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

CREATE POLICY "Enable update for event managers (QR)"
    ON qr_credentials FOR UPDATE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

-- 2. Access Zones RLS
CREATE POLICY "Enable read for event organizers (Zones)"
    ON access_zones FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.view'));

CREATE POLICY "Enable insert for event managers (Zones)"
    ON access_zones FOR INSERT
    WITH CHECK (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

CREATE POLICY "Enable update for event managers (Zones)"
    ON access_zones FOR UPDATE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

CREATE POLICY "Enable delete for event managers (Zones)"
    ON access_zones FOR DELETE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

-- 3. Access Rules RLS
CREATE POLICY "Enable read for event organizers (Rules)"
    ON access_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = access_rules.zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.view')
        )
    );

CREATE POLICY "Enable insert for event managers (Rules)"
    ON access_rules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.manage')
        )
    );

CREATE POLICY "Enable update for event managers (Rules)"
    ON access_rules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.manage')
        )
    );

CREATE POLICY "Enable delete for event managers (Rules)"
    ON access_rules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.manage')
        )
    );

-- 4. Access Assignments RLS
CREATE POLICY "Enable read for event organizers (Assignments)"
    ON access_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = access_assignments.zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.view')
        )
    );

CREATE POLICY "Enable insert for event managers (Assignments)"
    ON access_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.manage')
        )
    );

CREATE POLICY "Enable update for event managers (Assignments)"
    ON access_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.manage')
        )
    );

CREATE POLICY "Enable delete for event managers (Assignments)"
    ON access_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.manage')
        )
    );
