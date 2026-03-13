-- Update get_practice_public to include phone in player data
create or replace function public.get_practice_public(p_practice_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'practice', row_to_json(pr),
    'team', json_build_object('id', t.id, 'name', t.name, 'theme_color_name', t.theme_color_name, 'theme_color_hex', t.theme_color_hex),
    'players', (
      select json_agg(json_build_object('id', pl.id, 'full_name', pl.full_name, 'jersey_number', pl.jersey_number, 'phone', pl.phone))
      from players pl where pl.team_id = t.id and pl.active = true
    ),
    'invitations', (
      select json_agg(json_build_object('player_id', i.player_id, 'response_status', i.response_status))
      from invitations i where i.practice_id = pr.id
    )
  )
  from practices pr
  join teams t on t.id = pr.team_id
  where pr.id = p_practice_id
  limit 1;
$$;
