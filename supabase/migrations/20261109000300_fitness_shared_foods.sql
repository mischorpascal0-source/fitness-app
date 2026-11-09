begin;

create schema fitness_accounts_private;
revoke all on schema fitness_accounts_private from public, anon, authenticated;
grant usage on schema fitness_accounts_private to authenticated;

create table fitness_accounts_private.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table fitness_accounts_private.app_admins enable row level security;
revoke all on fitness_accounts_private.app_admins from public, anon, authenticated;

create function fitness_accounts_private.is_app_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from fitness_accounts_private.app_admins a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function fitness_accounts_private.is_app_admin() from public, anon, authenticated;
grant execute on function fitness_accounts_private.is_app_admin() to authenticated;

create table public.fitness_shared_foods (
  barcode text primary key check (barcode ~ '^([0-9]{8}|[0-9]{13,14})$'),
  name text not null check (char_length(btrim(name)) between 1 and 100 and name !~ '[[:cntrl:]]'),
  unit text not null check (unit in ('g', 'ml')),
  kcal real not null check (kcal between 0 and 2000),
  protein real not null check (protein between 0 and 200),
  carbs real not null check (carbs between 0 and 200),
  fat real not null check (fat between 0 and 200)
);

create index fitness_shared_food_name_search on public.fitness_shared_foods
  using gin (to_tsvector('simple'::regconfig, name));

alter table public.fitness_shared_foods enable row level security;
revoke all on public.fitness_shared_foods from public, anon, authenticated;
grant select, insert on public.fitness_shared_foods to authenticated;
grant update (name, unit, kcal, protein, carbs, fat) on public.fitness_shared_foods to authenticated;

create policy fitness_shared_food_read on public.fitness_shared_foods
  for select to authenticated using (true);
create policy fitness_shared_food_create on public.fitness_shared_foods
  for insert to authenticated with check ((select fitness_accounts_private.is_app_admin()));
create policy fitness_shared_food_edit on public.fitness_shared_foods
  for update to authenticated using ((select fitness_accounts_private.is_app_admin()))
  with check ((select fitness_accounts_private.is_app_admin()));

create function public.fitness_food_barcode(p_barcode text)
returns table (barcode text, name text, brand text, quantity text, unit text, kcal real, protein real, carbs real, fat real, source text, can_share boolean)
language sql stable security invoker set search_path = ''
as $$
  with matches as (
    select f.barcode, f.name, ''::text as brand, ''::text as quantity, f.unit, f.kcal, f.protein, f.carbs, f.fat, 'own'::text as source, 1 as priority
    from public.fitness_own_foods f
    where f.owner_id = (select auth.uid()) and f.barcode = p_barcode
    union all
    select f.barcode, f.name, '', '', f.unit, f.kcal, f.protein, f.carbs, f.fat, 'shared', 2
    from public.fitness_shared_foods f where f.barcode = p_barcode
    union all
    select f.barcode, f.name, f.brand, f.quantity, f.unit, f.kcal, f.protein, f.carbs, f.fat, 'off', 3
    from public.fitness_food_catalog f where f.barcode = p_barcode
  ), best as (select * from matches order by priority limit 1)
  select f.barcode, f.name, f.brand, f.quantity, f.unit, f.kcal, f.protein, f.carbs, f.fat, f.source,
    case when f.barcode is null then fitness_accounts_private.is_app_admin() else false end
  from (values (1)) as request(row_id) left join best f on true;
$$;

create or replace function public.fitness_food_search(p_query text)
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
    select f.barcode, f.name, '', '', f.unit, f.kcal, f.protein, f.carbs, f.fat, 'shared'
    from public.fitness_shared_foods f, needle
    where to_tsvector('simple'::regconfig, f.name) @@ needle.query
      and not exists (select 1 from public.fitness_own_foods o where o.owner_id = (select auth.uid()) and o.barcode = f.barcode)
    union all
    select f.barcode, f.name, f.brand, f.quantity, f.unit, f.kcal, f.protein, f.carbs, f.fat, 'off'
    from public.fitness_food_catalog f, needle
    where to_tsvector('simple'::regconfig, f.name || ' ' || f.brand) @@ needle.query
      and not exists (select 1 from public.fitness_own_foods o where o.owner_id = (select auth.uid()) and o.barcode = f.barcode)
      and not exists (select 1 from public.fitness_shared_foods s where s.barcode = f.barcode)
  )
  select * from matches order by case source when 'own' then 1 when 'shared' then 2 else 3 end, name, barcode limit 20;
$$;

create function public.fitness_food_save(p_food jsonb, p_expected_shared boolean)
returns table (barcode text, name text, unit text, kcal real, protein real, carbs real, fat real, source text)
language plpgsql security invoker set search_path = ''
as $$
declare
  product record;
  publish boolean := fitness_accounts_private.is_app_admin();
begin
  if publish is distinct from p_expected_shared then
    raise sqlstate 'PT409' using message = 'Food catalog permission changed';
  end if;

  select * into product
  from jsonb_to_record(p_food) as f(barcode text, name text, unit text, kcal real, protein real, carbs real, fat real);

  if publish then
    return query
    insert into public.fitness_shared_foods as f (barcode, name, unit, kcal, protein, carbs, fat)
    values (product.barcode, btrim(product.name), product.unit, product.kcal, product.protein, product.carbs, product.fat)
    on conflict on constraint fitness_shared_foods_pkey do update set
      name = excluded.name, unit = excluded.unit, kcal = excluded.kcal,
      protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat
    returning f.barcode, f.name, f.unit, f.kcal, f.protein, f.carbs, f.fat, 'shared'::text;
  else
    return query
    insert into public.fitness_own_foods as f (barcode, name, unit, kcal, protein, carbs, fat)
    values (product.barcode, btrim(product.name), product.unit, product.kcal, product.protein, product.carbs, product.fat)
    on conflict on constraint fitness_own_foods_pkey do update set
      name = excluded.name, unit = excluded.unit, kcal = excluded.kcal,
      protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat
    returning f.barcode, f.name, f.unit, f.kcal, f.protein, f.carbs, f.fat, 'own'::text;
  end if;
end;
$$;

revoke all on function public.fitness_food_barcode(text), public.fitness_food_save(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.fitness_food_barcode(text), public.fitness_food_save(jsonb, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
