-- PROFILES
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  avatar text,
  role text default 'SINGLE_MALE',
  desires text[],
  limits text[],
  bio text,
  is_verified boolean default false,
  is_vip boolean default false,
  vip_until timestamp with time zone,
  boost_until timestamp with time zone,
  credits integer default 0,
  gallery jsonb,
  unlocked_media text[],
  location text
);

-- CIRCLES (Secret Groups)
create table circles (
  id uuid default gen_random_uuid() primary key,
  code text unique not null, -- The viral invite code
  name text not null,
  description text,
  theme text, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references profiles(id) not null
);

-- CIRCLE MEMBERS
create table circle_members (
  id uuid default gen_random_uuid() primary key,
  circle_id uuid references circles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  role text default 'MEMBER', 
  unique(circle_id, user_id)
);

-- RLS
alter table profiles enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;

create policy "Public profiles are viewable by everyone" on profiles for select using ( true );
create policy "Users can update own profile" on profiles for update using ( auth.uid() = id );

create policy "Users can create circles" on circles for insert with check (auth.uid() = created_by);
create policy "Members can view circles" on circles for select using (
  exists (
    select 1 from circle_members
    where circle_members.circle_id = circles.id
    and circle_members.user_id = auth.uid()
  )
);
create policy "Members can view circle members" on circle_members for select using (
  exists (
    select 1 from circle_members as cm
    where cm.circle_id = circle_members.circle_id
    and cm.user_id = auth.uid()
  )
);
create policy "Users can join circles" on circle_members for insert with check (auth.uid() = user_id);