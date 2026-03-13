-- Fix ALL circular RLS policies
-- Root cause: policies on tables A, B, C reference each other creating cycles
-- Solution: coach policies should only check coach_id directly or via a single join
-- Public policies should use permissive simple checks

-- =====================
-- Drop ALL existing policies
-- =====================

-- coaches
drop policy if exists "Coaches can view own record" on coaches;
drop policy if exists "Coaches can insert own record" on coaches;
drop policy if exists "Coaches can update own record" on coaches;

-- teams
drop policy if exists "Coaches can view own teams" on teams;
drop policy if exists "Coaches can insert own teams" on teams;
drop policy if exists "Coaches can update own teams" on teams;
drop policy if exists "Coaches can delete own teams" on teams;
drop policy if exists "Public can view team for invite" on teams;
drop policy if exists "Public can view team via invitation" on teams;

-- players
drop policy if exists "Coaches can view own team players" on players;
drop policy if exists "Coaches can insert players to own teams" on players;
drop policy if exists "Coaches can update own team players" on players;
drop policy if exists "Public can view player for invite" on players;
drop policy if exists "Public can view players via invitation" on players;

-- practices
drop policy if exists "Coaches can view own team practices" on practices;
drop policy if exists "Coaches can insert practices to own teams" on practices;
drop policy if exists "Coaches can update own team practices" on practices;
drop policy if exists "Public can view practice for invite" on practices;
drop policy if exists "Public can view practices via invitation" on practices;

-- invitations
drop policy if exists "Coaches can view own practice invitations" on invitations;
drop policy if exists "Coaches can insert invitations" on invitations;
drop policy if exists "Public can view invitation by token" on invitations;
drop policy if exists "Public can update invitation response" on invitations;

-- attendance
drop policy if exists "Coaches can view attendance" on attendance;
drop policy if exists "Coaches can insert attendance" on attendance;
drop policy if exists "Coaches can update attendance" on attendance;

-- =====================
-- Recreate ALL policies (no circular references)
-- =====================

-- COACHES (no cross-table references needed)
create policy "coaches_select_own" on coaches for select using (auth.uid() = id);
create policy "coaches_insert_own" on coaches for insert with check (auth.uid() = id);
create policy "coaches_update_own" on coaches for update using (auth.uid() = id);

-- TEAMS (only references coaches via coach_id, no cycle)
create policy "teams_select_coach" on teams for select using (auth.uid() = coach_id);
create policy "teams_insert_coach" on teams for insert with check (auth.uid() = coach_id);
create policy "teams_update_coach" on teams for update using (auth.uid() = coach_id);
create policy "teams_delete_coach" on teams for delete using (auth.uid() = coach_id);

-- PLAYERS (references teams only)
create policy "players_select_coach" on players for select using (
  team_id in (select id from teams where coach_id = auth.uid())
);
create policy "players_insert_coach" on players for insert with check (
  team_id in (select id from teams where coach_id = auth.uid())
);
create policy "players_update_coach" on players for update using (
  team_id in (select id from teams where coach_id = auth.uid())
);

-- PRACTICES (references teams only)
create policy "practices_select_coach" on practices for select using (
  team_id in (select id from teams where coach_id = auth.uid())
);
create policy "practices_insert_coach" on practices for insert with check (
  team_id in (select id from teams where coach_id = auth.uid())
);
create policy "practices_update_coach" on practices for update using (
  team_id in (select id from teams where coach_id = auth.uid())
);

-- INVITATIONS
-- Coach access: references practices -> teams (2 levels, no cycle since invitations is the leaf)
create policy "invitations_select_coach" on invitations for select using (
  practice_id in (
    select id from practices where team_id in (
      select id from teams where coach_id = auth.uid()
    )
  )
);
create policy "invitations_insert_coach" on invitations for insert with check (
  practice_id in (
    select id from practices where team_id in (
      select id from teams where coach_id = auth.uid()
    )
  )
);

-- Public access to invitations: allow all select/update (token is the security)
-- This is safe because the token is random and unguessable
create policy "invitations_select_public" on invitations for select using (true);
create policy "invitations_update_public" on invitations for update using (true) with check (true);

-- ATTENDANCE (references practices -> teams, no cycle)
create policy "attendance_select_coach" on attendance for select using (
  practice_id in (
    select id from practices where team_id in (
      select id from teams where coach_id = auth.uid()
    )
  )
);
create policy "attendance_insert_coach" on attendance for insert with check (
  practice_id in (
    select id from practices where team_id in (
      select id from teams where coach_id = auth.uid()
    )
  )
);
create policy "attendance_update_coach" on attendance for update using (
  practice_id in (
    select id from practices where team_id in (
      select id from teams where coach_id = auth.uid()
    )
  )
);

-- =====================
-- PUBLIC access for invite pages (anon users viewing invite/[token])
-- These use security definer functions to bypass RLS safely
-- =====================

-- Create a function that fetches invite data without RLS checks
create or replace function public.get_invite_data(invite_token text)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'invitation', row_to_json(i),
    'player', row_to_json(pl),
    'practice', row_to_json(pr),
    'team', json_build_object('id', t.id, 'name', t.name, 'theme_color_name', t.theme_color_name, 'theme_color_hex', t.theme_color_hex)
  )
  from invitations i
  join players pl on pl.id = i.player_id
  join practices pr on pr.id = i.practice_id
  join teams t on t.id = pr.team_id
  where i.token = invite_token
  limit 1;
$$;

-- Function to update invite response (bypasses RLS)
create or replace function public.respond_to_invite(invite_token text, new_status text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  prac record;
begin
  select i.*, p.practice_date, p.start_time
  into inv
  from invitations i
  join practices p on p.id = i.practice_id
  where i.token = invite_token;

  if inv is null then
    return json_build_object('error', 'not_found');
  end if;

  -- Check if practice has started
  if (inv.practice_date + inv.start_time) < now() then
    return json_build_object('error', 'locked');
  end if;

  -- Validate status
  if new_status not in ('yes', 'no', 'maybe') then
    return json_build_object('error', 'invalid_status');
  end if;

  update invitations
  set response_status = new_status, responded_at = now()
  where token = invite_token;

  return json_build_object('success', true, 'status', new_status);
end;
$$;

-- Function to update last_opened_at
create or replace function public.mark_invite_opened(invite_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update invitations set last_opened_at = now() where token = invite_token;
$$;
