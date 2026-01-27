
-- 1. FIX CLUB EVENTS TABLE
DO $$ 
BEGIN
    -- Rename if exists or ensure images column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_events' AND column_name = 'image_url') THEN
        ALTER TABLE club_events DROP COLUMN image_url;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_events' AND column_name = 'images') THEN
        ALTER TABLE club_events ADD COLUMN images TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 2. AUTO-CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION cleanup_old_club_events()
RETURNS void AS $$
BEGIN
  DELETE FROM club_events
  WHERE date < (NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS POLICIES FOR EDIT/DELETE
-- Ensuring the owner of the club can manage events
DROP POLICY IF EXISTS "Clubs can manage own events" ON club_events;
CREATE POLICY "Clubs can manage own events" ON club_events 
FOR ALL 
USING (
  club_id = auth.uid()
)
WITH CHECK (
  club_id = auth.uid()
);

-- 4. CRON-LIKE CLEANUP (Optional but good)
-- If you have pg_cron enabled, you can schedule it. Otherwise, we call it via RPC from API.
