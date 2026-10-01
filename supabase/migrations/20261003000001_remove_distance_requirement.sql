-- 20261003000001_remove_distance_requirement.sql

-- 1. Drop the old idempotency constraint
ALTER TABLE public.certificate_issuances DROP CONSTRAINT IF EXISTS uq_certificate_idempotency;

-- 2. Make columns nullable since we don't strictly require distance, and email is optional for downloads
ALTER TABLE public.certificate_issuances ALTER COLUMN distance DROP NOT NULL;
ALTER TABLE public.certificate_issuances ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.certificate_issuances ALTER COLUMN normalized_email DROP NOT NULL;

-- 3. Create a new idempotency constraint on just event_id and normalized_email
-- PostgreSQL treats NULL values as distinct by default, so this allows multiple downloads without emails
ALTER TABLE public.certificate_issuances ADD CONSTRAINT uq_certificate_idempotency UNIQUE (event_id, normalized_email);
