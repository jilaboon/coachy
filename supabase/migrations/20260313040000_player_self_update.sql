-- Allow players to update their own phone and jersey number via public link
create or replace function public.update_player_details(
  p_player_id uuid,
  p_phone text,
  p_jersey_number integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update players
  set phone = p_phone, jersey_number = p_jersey_number
  where id = p_player_id;

  if not found then
    return json_build_object('error', 'not_found');
  end if;

  return json_build_object('success', true);
end;
$$;
