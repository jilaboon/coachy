-- Add logo_url column to teams
alter table teams add column logo_url text;

-- Create storage bucket for team logos
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their team's folder
create policy "Coaches can upload team logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'team-logos'
);

-- Allow authenticated users to update their uploads
create policy "Coaches can update team logos"
on storage.objects for update
to authenticated
using (bucket_id = 'team-logos');

-- Allow authenticated users to delete their uploads
create policy "Coaches can delete team logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'team-logos');

-- Allow public read access to logos
create policy "Public can view team logos"
on storage.objects for select
to public
using (bucket_id = 'team-logos');
