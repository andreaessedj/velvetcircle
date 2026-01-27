
-- 1. Update club_events table to support multiple images
ALTER TABLE club_events DROP COLUMN IF EXISTS image_url;
ALTER TABLE club_events ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Function to cleanup events older than 7 days from their date
CREATE OR REPLACE FUNCTION cleanup_old_club_events()
RETURNS void AS $$
BEGIN
  DELETE FROM club_events
  WHERE date < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger or explicit call from API to cleanup
-- For simplicity and because we are on a hosted environment, we will call this via RPC from the API.

-- 4. Ensure club_profiles has proper RLS for the new fields if needed (already has it)
