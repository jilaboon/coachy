-- RPC to get practice data for public page (no auth needed)
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
      select json_agg(json_build_object('id', pl.id, 'full_name', pl.full_name, 'jersey_number', pl.jersey_number))
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

-- RPC to respond (by practice_id + player_id instead of token)
create or replace function public.respond_to_practice(p_practice_id uuid, p_player_id uuid, p_status text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  select i.*, p.practice_date, p.start_time
  into inv
  from invitations i
  join practices p on p.id = i.practice_id
  where i.practice_id = p_practice_id and i.player_id = p_player_id;

  if inv is null then
    return json_build_object('error', 'not_found');
  end if;

  if (inv.practice_date + inv.start_time) < now() then
    return json_build_object('error', 'locked');
  end if;

  if p_status not in ('yes', 'no', 'maybe') then
    return json_build_object('error', 'invalid_status');
  end if;

  update invitations
  set response_status = p_status, responded_at = now()
  where practice_id = p_practice_id and player_id = p_player_id;

  return json_build_object('success', true, 'status', p_status);
end;
$$;
