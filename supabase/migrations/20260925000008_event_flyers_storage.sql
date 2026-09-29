-- Create a new storage bucket for event flyers
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-flyers', 'event-flyers', true)
ON CONFLICT (id) DO UPDATE SET public = true;



-- Allow public read access to the event-flyers bucket
CREATE POLICY "Public Read Access for Event Flyers"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-flyers');

-- Allow authenticated users to insert files into event-flyers
CREATE POLICY "Authenticated Insert Access for Event Flyers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-flyers');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated Update Access for Event Flyers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-flyers');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated Delete Access for Event Flyers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-flyers');
