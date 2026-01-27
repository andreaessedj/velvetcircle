-- 1. Create Circles Table
create table if not exists circles (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  description text,
  theme text, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references profiles(id) not null
);

-- 2. Create Circle Members Table
create table if not exists circle_members (
  id uuid default gen_random_uuid() primary key,
  circle_id uuid references circles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  role text default 'MEMBER', 
  unique(circle_id, user_id)
);

-- 3. Enable Security (RLS)
alter table circles enable row level security;
alter table circle_members enable row level security;

-- 4. Policies
drop policy if exists "Users can create circles" on circles;
create policy "Users can create circles" on circles for insert with check (auth.uid() = created_by);

drop policy if exists "Members can view circles" on circles;
create policy "Members can view circles" on circles for select using (
  exists (
    select 1 from circle_members
    where circle_members.circle_id = circles.id
    and circle_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can view circle members" on circle_members;
create policy "Members can view circle members" on circle_members for select using (
  exists (
    select 1 from circle_members as cm
    where cm.circle_id = circle_members.circle_id
    and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can join circles" on circle_members;
create policy "Users can join circles" on circle_members for insert with check (auth.uid() = user_id);
