-- CLUB PROFILES
CREATE TABLE club_profiles (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  photos TEXT[], -- Array of image URLs
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- CLUB EVENTS
CREATE TABLE club_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES club_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  image_url TEXT,
  price TEXT,
  location TEXT, -- Can be the club address by default
  attendees_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE club_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clubs are public" ON club_profiles FOR SELECT USING (true);
CREATE POLICY "Clubs can manage own profile" ON club_profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Events are public" ON club_events FOR SELECT USING (true);
CREATE POLICY "Clubs can manage own events" ON club_events FOR ALL USING (
  EXISTS (
    SELECT 1 FROM club_profiles
    WHERE club_profiles.id = club_events.club_id
    AND club_profiles.id = auth.uid()
  )
);

-- Function to handle club registration (optional, can be done via API)
-- But we need to make sure 'CLUB' role is allowed in profiles.

-- Update profiles role check if any (not strictly needed as it's a text field but better to be safe)
