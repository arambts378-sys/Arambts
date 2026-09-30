-- Drop the ambiguous 2-argument check-in function
DROP FUNCTION IF EXISTS public.process_check_in(text, uuid);
