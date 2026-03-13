-- Coachy - Basketball Coach Attendance App
-- Supabase Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Coaches table
create table coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  created_at timestamp with time zone default now()
);

-- Teams table
create table teams (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references coaches(id) on delete cascade,
  name text not null,
  age_group text,
  theme_color_name text default 'כחול',
  theme_color_hex text default '#2563eb',
  created_at timestamp with time zone default now()
);

-- Players table
create table players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  full_name text not null,
  phone text,
  jersey_number integer,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Practices table
create table practices (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  title text default 'אימון',
  practice_date date not null,
  start_time time not null,
  end_time time,
  location text,
  notes text,
  status text default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamp with time zone default now()
);

-- Invitations table
create table invitations (
  id uuid primary key default uuid_generate_v4(),
  practice_id uuid not null references practices(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  token text unique not null,
  response_status text default 'no_response' check (response_status in ('yes', 'no', 'maybe', 'no_response')),
  responded_at timestamp with time zone,
  last_opened_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Attendance table
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  practice_id uuid not null references practices(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  actual_attended boolean default false,
  marked_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(practice_id, player_id)
);

-- Indexes
create index idx_teams_coach on teams(coach_id);
create index idx_players_team on players(team_id);
create index idx_practices_team on practices(team_id);
create index idx_invitations_practice on invitations(practice_id);
create index idx_invitations_player on invitations(player_id);
create index idx_invitations_token on invitations(token);
create index idx_attendance_practice on attendance(practice_id);

-- Row Level Security

alter table coaches enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table practices enable row level security;
alter table invitations enable row level security;
alter table attendance enable row level security;

-- Coaches: users can only see/edit their own record
create policy "Coaches can view own record" on coaches
  for select using (auth.uid() = id);

create policy "Coaches can insert own record" on coaches
  for insert with check (auth.uid() = id);

create policy "Coaches can update own record" on coaches
  for update using (auth.uid() = id);

-- Teams: coaches can manage their own teams
create policy "Coaches can view own teams" on teams
  for select using (auth.uid() = coach_id);

create policy "Coaches can insert own teams" on teams
  for insert with check (auth.uid() = coach_id);

create policy "Coaches can update own teams" on teams
  for update using (auth.uid() = coach_id);

create policy "Coaches can delete own teams" on teams
  for delete using (auth.uid() = coach_id);

-- Players: coaches can manage players on their teams
create policy "Coaches can view own team players" on players
  for select using (
    team_id in (select id from teams where coach_id = auth.uid())
  );

create policy "Coaches can insert players to own teams" on players
  for insert with check (
    team_id in (select id from teams where coach_id = auth.uid())
  );

create policy "Coaches can update own team players" on players
  for update using (
    team_id in (select id from teams where coach_id = auth.uid())
  );

-- Players: public can view player name for invite page (via token lookup)
create policy "Public can view players via invitation" on players
  for select using (
    id in (select player_id from invitations)
  );

-- Practices: coaches can manage practices for their teams
create policy "Coaches can view own team practices" on practices
  for select using (
    team_id in (select id from teams where coach_id = auth.uid())
  );

create policy "Coaches can insert practices to own teams" on practices
  for insert with check (
    team_id in (select id from teams where coach_id = auth.uid())
  );

create policy "Coaches can update own team practices" on practices
  for update using (
    team_id in (select id from teams where coach_id = auth.uid())
  );

-- Practices: public can view practice details via invitation token
create policy "Public can view practices via invitation" on practices
  for select using (
    id in (select practice_id from invitations)
  );

-- Invitations: coaches can manage invitations for their practices
create policy "Coaches can view own practice invitations" on invitations
  for select using (
    practice_id in (
      select p.id from practices p
      join teams t on t.id = p.team_id
      where t.coach_id = auth.uid()
    )
  );

create policy "Coaches can insert invitations" on invitations
  for insert with check (
    practice_id in (
      select p.id from practices p
      join teams t on t.id = p.team_id
      where t.coach_id = auth.uid()
    )
  );

-- Invitations: public can view and update by token (for player responses)
create policy "Public can view invitation by token" on invitations
  for select using (true);

create policy "Public can update invitation response" on invitations
  for update using (true)
  with check (true);

-- Teams: public can view team for invite page
create policy "Public can view team via invitation" on teams
  for select using (
    id in (
      select p.team_id from practices p
      join invitations i on i.practice_id = p.id
    )
  );

-- Attendance: coaches can manage attendance
create policy "Coaches can view attendance" on attendance
  for select using (
    practice_id in (
      select p.id from practices p
      join teams t on t.id = p.team_id
      where t.coach_id = auth.uid()
    )
  );

create policy "Coaches can insert attendance" on attendance
  for insert with check (
    practice_id in (
      select p.id from practices p
      join teams t on t.id = p.team_id
      where t.coach_id = auth.uid()
    )
  );

create policy "Coaches can update attendance" on attendance
  for update using (
    practice_id in (
      select p.id from practices p
      join teams t on t.id = p.team_id
      where t.coach_id = auth.uid()
    )
  );
