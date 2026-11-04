begin;

create table public.fitness_training_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  name text generated always as (data ->> 'name') stored not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint valid_plan_name check (char_length(btrim(name)) between 1 and 100),
  constraint valid_plan_document check (
    jsonb_typeof(data) = 'object'
    and jsonb_typeof(data -> 'name') = 'string'
    and jsonb_typeof(data -> 'sessions') is not distinct from 'array'
  )
);

create index fitness_training_plans_owner_updated_idx
  on public.fitness_training_plans (owner_id, updated_at desc, id);

create function public.fitness_training_plan_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger fitness_training_plan_touch
before update on public.fitness_training_plans
for each row execute function public.fitness_training_plan_touch();

revoke all on function public.fitness_training_plan_touch() from public, anon, authenticated;

alter table public.fitness_training_plans enable row level security;
revoke all on public.fitness_training_plans from public, anon, authenticated;
grant select, delete on public.fitness_training_plans to authenticated;
grant insert (data), update (data) on public.fitness_training_plans to authenticated;

create policy fitness_plan_read_own on public.fitness_training_plans
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy fitness_plan_create_own on public.fitness_training_plans
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy fitness_plan_update_own on public.fitness_training_plans
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy fitness_plan_delete_own on public.fitness_training_plans
  for delete to authenticated using ((select auth.uid()) = owner_id);

commit;
