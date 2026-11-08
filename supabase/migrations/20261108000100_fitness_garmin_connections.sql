begin;

-- Only encrypted credentials are stored here. A null key records a disconnect,
-- so an old browser cookie cannot silently reconnect the account later.
create table public.fitness_garmin_connections (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  encrypted_key text,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint valid_garmin_ciphertext check (
    encrypted_key is null or
    (char_length(encrypted_key) between 32 and 4096 and encrypted_key ~ '^v1\.[A-Za-z0-9_-]+$')
  )
);

create function public.fitness_garmin_connection_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger fitness_garmin_connection_touch
before update on public.fitness_garmin_connections
for each row execute function public.fitness_garmin_connection_touch();

revoke all on function public.fitness_garmin_connection_touch() from public, anon, authenticated;
alter table public.fitness_garmin_connections enable row level security;
revoke all on public.fitness_garmin_connections from public, anon, authenticated;
grant select on public.fitness_garmin_connections to authenticated;
grant insert (encrypted_key), update (encrypted_key) on public.fitness_garmin_connections to authenticated;

create policy garmin_connection_read_own on public.fitness_garmin_connections
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy garmin_connection_insert_own on public.fitness_garmin_connections
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy garmin_connection_update_own on public.fitness_garmin_connections
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;
