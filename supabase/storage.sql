-- =========================================================================
-- Receipts bucket — paste into Supabase SQL Editor and Run.
-- Idempotent. Allows authenticated household members to upload/read/delete
-- their own household's receipts only.
-- =========================================================================

-- Create the (private) bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,  -- 10 MB per file
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Drop existing policies (so this is re-runnable)
drop policy if exists "receipts_select" on storage.objects;
drop policy if exists "receipts_insert" on storage.objects;
drop policy if exists "receipts_delete" on storage.objects;
drop policy if exists "receipts_update" on storage.objects;

-- Members of the household can read/write objects under
-- prefix "<household_id>/..." within the receipts bucket.
create policy "receipts_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (
      select household_id::text from public.profiles where id = auth.uid()
    )
  );

create policy "receipts_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (
      select household_id::text from public.profiles where id = auth.uid()
    )
  );

create policy "receipts_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (
      select household_id::text from public.profiles where id = auth.uid()
    )
  );

create policy "receipts_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (
      select household_id::text from public.profiles where id = auth.uid()
    )
  );
