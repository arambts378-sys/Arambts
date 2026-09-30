-- 20261003000000_certificates.sql

-- 1. Create certificate_issuances table
CREATE TABLE IF NOT EXISTS public.certificate_issuances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    normalized_email TEXT NOT NULL,
    distance TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('pending', 'generated', 'failed')),
    email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'processing', 'sent', 'failed')),
    certificate_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency constraint: 1 certificate per email per distance per event
ALTER TABLE public.certificate_issuances ADD CONSTRAINT uq_certificate_idempotency UNIQUE (event_id, normalized_email, distance);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_certificates_event_email ON public.certificate_issuances(event_id, normalized_email);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.certificate_issuances(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificate_issuances(status, email_status);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_certificate_issuances
    BEFORE UPDATE ON public.certificate_issuances
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS: Only server APIs (service_role) should be able to read/write this.
-- Public access is strictly denied.
ALTER TABLE public.certificate_issuances ENABLE ROW LEVEL SECURITY;

-- 2. Create private storage bucket for certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'certificates',
    'certificates',
    false, -- Private bucket
    5242880, -- 5MB limit
    ARRAY['image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    allowed_mime_types = ARRAY['image/png', 'application/pdf'];

-- RLS for storage bucket (Server-side APIs using service_role bypass RLS, but we can set strict policies to ensure no client access)
CREATE POLICY "Deny all public access to certificates bucket" 
    ON storage.objects FOR ALL 
    USING (bucket_id = 'certificates' AND false);
