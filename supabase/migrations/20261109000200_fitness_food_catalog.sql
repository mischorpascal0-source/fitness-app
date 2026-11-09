begin;

create table public.fitness_food_catalog (
  barcode text primary key check (barcode ~ '^([0-9]{8}|[0-9]{13,14})$'),
  name text not null check (char_length(name) between 1 and 200),
  brand text not null default '',
  quantity text not null default '',
  unit text not null check (unit in ('g', 'ml')),
  kcal real check (kcal between 0 and 2000),
  protein real check (protein between 0 and 200),
  carbs real check (carbs between 0 and 200),
  fat real check (fat between 0 and 200),
  updated_at bigint
);

create table public.fitness_own_foods (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barcode text not null check (barcode ~ '^([0-9]{8}|[0-9]{13,14})$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  unit text not null check (unit in ('g', 'ml')),
  kcal real not null check (kcal between 0 and 2000),
  protein real not null check (protein between 0 and 200),
  carbs real not null check (carbs between 0 and 200),
  fat real not null check (fat between 0 and 200),
  primary key (owner_id, barcode)
);

create index fitness_food_catalog_name_search on public.fitness_food_catalog
  using gin (to_tsvector('simple'::regconfig, name || ' ' || brand));

alter table public.fitness_food_catalog enable row level security;
alter table public.fitness_own_foods enable row level security;
revoke all on public.fitness_food_catalog, public.fitness_own_foods from public, anon, authenticated;
grant select on public.fitness_food_catalog to authenticated;
grant select on public.fitness_own_foods to authenticated;
grant insert (barcode, name, unit, kcal, protein, carbs, fat),
  update (barcode, name, unit, kcal, protein, carbs, fat) on public.fitness_own_foods to authenticated;

create policy fitness_food_catalog_read on public.fitness_food_catalog
  for select to authenticated using (true);
create policy fitness_own_food_read on public.fitness_own_foods
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy fitness_own_food_create on public.fitness_own_foods
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy fitness_own_food_edit on public.fitness_own_foods
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create function public.fitness_food_search(p_query text)
returns table (barcode text, name text, brand text, quantity text, unit text, kcal real, protein real, carbs real, fat real, source text)
language sql stable security invoker set search_path = ''
as $$
  with needle as (
    select to_tsquery('simple'::regconfig, string_agg(quote_literal(word) || ':*', ' & ')) as query
    from regexp_split_to_table(lower(btrim(left(p_query, 80))), '[^[:alnum:]]+') as words(word)
    where word <> ''
    having char_length(btrim(left(p_query, 80))) >= 3
  ), matches as (
    select f.barcode, f.name, ''::text as brand, ''::text as quantity, f.unit, f.kcal, f.protein, f.carbs, f.fat, 'own'::text as source
    from public.fitness_own_foods f, needle
    where f.owner_id = (select auth.uid()) and to_tsvector('simple'::regconfig, f.name) @@ needle.query
    union all
    select f.barcode, f.name, f.brand, f.quantity, f.unit, f.kcal, f.protein, f.carbs, f.fat, 'off'::text as source
    from public.fitness_food_catalog f, needle
    where to_tsvector('simple'::regconfig, f.name || ' ' || f.brand) @@ needle.query
      and not exists (select 1 from public.fitness_own_foods o where o.owner_id = (select auth.uid()) and o.barcode = f.barcode)
  )
  select * from matches order by source desc, name, barcode limit 20;
$$;

revoke all on function public.fitness_food_search(text) from public, anon, authenticated;
grant execute on function public.fitness_food_search(text) to authenticated;

commit;
