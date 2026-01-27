-- SECURITY & MODERATION
create table if not exists blocked_users (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references profiles(id) on delete cascade not null,
  blocked_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(blocker_id, blocked_id)
);

create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references profiles(id) on delete set null,
  target_id uuid not null,
  target_type text not null, 
  reason text not null,
  status text default 'PENDING', 
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles add column if not exists is_banned boolean default false;
alter table profiles add column if not exists ban_reason text;

-- CHAT UX
alter table private_messages add column if not exists image_url text;

-- NOTIFICATIONS
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null, 
  content text not null,
  is_read boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for new tables
alter table blocked_users enable row level security;
alter table reports enable row level security;
alter table notifications enable row level security;

create policy "Users can manage own blocks" on blocked_users
  for all using (auth.uid() = blocker_id);

create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id);

create policy "Users can create reports" on reports
  for insert with check (auth.uid() = reporter_id);

create policy "Admins can view reports" on reports
  for select using (
    exists (
      select 1 from profiles where id = auth.uid() and (role = 'ADMIN' or email = 'andreaesse@live.it')
    )
  );
