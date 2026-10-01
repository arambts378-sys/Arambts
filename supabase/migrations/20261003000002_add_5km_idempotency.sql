-- 20261003000002_add_5km_idempotency.sql

-- 1. Drop the current idempotency constraint
ALTER TABLE public.certificate_issuances DROP CONSTRAINT IF EXISTS uq_certificate_idempotency;

-- 2. Update existing rows with NULL distance to 'standard'
UPDATE public.certificate_issuances
SET distance = 'standard'
WHERE distance IS NULL;

-- 3. Set the default to 'standard' and make distance NOT NULL again
ALTER TABLE public.certificate_issuances ALTER COLUMN distance SET DEFAULT 'standard';
ALTER TABLE public.certificate_issuances ALTER COLUMN distance SET NOT NULL;

-- 4. Create the new idempotency constraint including distance
ALTER TABLE public.certificate_issuances ADD CONSTRAINT uq_certificate_idempotency UNIQUE (event_id, normalized_email, distance);
