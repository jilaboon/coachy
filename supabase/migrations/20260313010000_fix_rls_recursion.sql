-- Fix infinite recursion in RLS policies
-- The issue: teams -> invitations -> practices -> teams creates a circular dependency

-- Drop the problematic policies
drop policy if exists "Public can view team via invitation" on teams;
drop policy if exists "Public can view practices via invitation" on practices;
drop policy if exists "Public can view players via invitation" on players;

-- Recreate without circular references
-- For public invite pages, we use a simpler approach:
-- Allow select on teams/practices/players where the ID is directly referenced by an invitation token
-- Use only the invitations table (no joins that cause recursion)

-- Teams: public can view team if its ID exists in practices that have invitations
-- Break the cycle by querying only invitations.practice_id -> practices.team_id without going back to teams
create policy "Public can view team for invite" on teams
  for select using (
    id in (
      select team_id from practices where id in (
        select practice_id from invitations
      )
    )
  );

-- Practices: public can view practice if it has invitations (simple, no joins)
create policy "Public can view practice for invite" on practices
  for select using (
    id in (select practice_id from invitations)
  );

-- Players: public can view player if they have an invitation (simple, no joins)
create policy "Public can view player for invite" on players
  for select using (
    id in (select player_id from invitations)
  );
