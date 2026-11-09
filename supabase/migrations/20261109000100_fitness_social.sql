begin;

create schema fitness_social_private;
revoke all on schema fitness_social_private from public, anon, authenticated;

create table fitness_social_private.profiles (
  owner uuid primary key references auth.users(id) on delete cascade,
  handle text not null check (handle ~ '^[A-Za-z0-9_]{3,20}#[0-9]{4}$'),
  enabled boolean not null default true,
  categories jsonb not null default '{"strength":false,"cardio":false,"nutrition":false}',
  revision integer not null default 1
);
create unique index fitness_social_handle on fitness_social_private.profiles (lower(handle));

create table fitness_social_private.friendships (
  id uuid not null unique default gen_random_uuid(),
  first_user uuid references fitness_social_private.profiles on delete cascade,
  second_user uuid references fitness_social_private.profiles on delete cascade,
  requester uuid not null,
  accepted boolean not null default false,
  primary key (first_user, second_user),
  check (first_user < second_user and requester in (first_user, second_user))
);
create index fitness_social_second_user on fitness_social_private.friendships (second_user);

create table fitness_social_private.weeks (
  owner uuid references fitness_social_private.profiles on delete cascade,
  device uuid not null,
  week date not null,
  category text not null check (category in ('strength','cardio','nutrition')),
  entries jsonb not null check (jsonb_typeof(entries) = 'array'),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (owner, week, category, device)
);

create table fitness_social_private.shares (
  owner uuid references fitness_social_private.profiles on delete cascade,
  source_id uuid not null,
  friendship uuid references fitness_social_private.friendships(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  date date not null,
  minutes integer not null check (minutes between 0 and 1440),
  sets integer not null check (sets between 0 and 1000),
  shared_at timestamptz not null default statement_timestamp(),
  primary key (owner, source_id, friendship)
);
create index fitness_social_share_friendship on fitness_social_private.shares (friendship);

alter table fitness_social_private.profiles enable row level security;
alter table fitness_social_private.friendships enable row level security;
alter table fitness_social_private.weeks enable row level security;
alter table fitness_social_private.shares enable row level security;
revoke all on all tables in schema fitness_social_private from public, anon, authenticated;

-- The authenticated RPC is the only entry point. Use the caller's JWT and recheck
-- friendship and consent on each read. Writes affecting consent share a row lock.
create function public.fitness_social(p_action text, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  me fitness_social_private.profiles%rowtype;
  other fitness_social_private.profiles%rowtype;
  connection fitness_social_private.friendships%rowtype;
  name_part text;
  category text;
  week_start date;
  week_entries jsonb;
  new_categories jsonb := '{"strength":false,"cardio":false,"nutrition":false}';
  turning_on boolean;
  seed integer;
  offset_index integer;
  device_id uuid;
  workout_id uuid;
  workout_name text;
  workout_date date;
  workout_minutes integer;
  workout_sets integer;
  selected_friends uuid[];
  requested_count integer;
  stats jsonb;
begin
  if actor is null then
    raise sqlstate 'PT401' using message = 'Melde dich für Social an.';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or pg_column_size(p_payload) > 200000 then
    raise sqlstate 'PT400' using message = 'Ungültige Social-Anfrage.';
  end if;

  if p_action in ('enable','settings','stats','share','withdraw') then
    -- Also covers concurrent first-time activation before a profile row exists.
    perform pg_advisory_xact_lock(hashtextextended(actor::text, 418822));
  end if;
  select * into me from fitness_social_private.profiles where owner = actor;

  if p_action = 'state' then
    if me.owner is null then return jsonb_build_object('profile', null); end if;
    return jsonb_build_object(
      'profile', jsonb_build_object('handle', me.handle, 'enabled', me.enabled, 'categories', me.categories, 'revision', me.revision),
      'connections', case when me.enabled then coalesce((
        select jsonb_agg(jsonb_build_object('handle', p.handle, 'status',
          case when f.accepted then 'friend' when f.requester = actor then 'outgoing' else 'incoming' end)
          order by lower(p.handle))
        from fitness_social_private.friendships f
        join fitness_social_private.profiles p on p.owner = case when f.first_user = actor then f.second_user else f.first_user end
        where actor in (f.first_user, f.second_user) and p.enabled
      ), '[]') else '[]' end,
      'shares', case when me.enabled and (me.categories->>'strength')::boolean then coalesce((
        select jsonb_agg(post order by shared_at desc)
        from (
          select max(s.shared_at) as shared_at,
            jsonb_build_object('id', s.source_id, 'name', s.name, 'date', s.date, 'minutes', s.minutes,
              'sets', s.sets, 'recipients', jsonb_agg(p.handle order by lower(p.handle)) filter (where p.enabled)) as post
          from fitness_social_private.shares s
          join fitness_social_private.friendships f on f.id = s.friendship and f.accepted
          join fitness_social_private.profiles p on p.owner = case when f.first_user = actor then f.second_user else f.first_user end
          where s.owner = actor
          group by s.source_id, s.name, s.date, s.minutes, s.sets
        ) posts
      ), '[]') else '[]' end
    );
  end if;

  if p_action = 'enable' then
    if me.owner is not null then return jsonb_build_object('handle', me.handle); end if;
    name_part := btrim(p_payload->>'name');
    if name_part is null or name_part !~ '^[A-Za-z0-9_]{3,20}$' then
      raise sqlstate 'PT400' using message = 'Verwende 3–20 Buchstaben (A–Z), Ziffern oder Unterstriche.';
    end if;
    seed := floor(random() * 10000)::integer;
    for offset_index in 0..9999 loop
      insert into fitness_social_private.profiles (owner, handle)
      values (actor, name_part || '#' || lpad(((seed + offset_index) % 10000)::text, 4, '0'))
      on conflict do nothing
      returning * into me;
      if found then return jsonb_build_object('handle', me.handle); end if;
    end loop;
    raise sqlstate 'PT409' using message = 'Für diesen Namen sind alle Kennungen belegt. Wähle einen anderen Namen.';
  end if;

  if me.owner is null then
    raise sqlstate 'PT403' using message = 'Aktiviere zuerst Social.';
  end if;

  if p_action in ('settings','stats','share') and p_payload->'revision' is distinct from to_jsonb(me.revision) then
    raise sqlstate 'PT409' using message = 'Die Social-Einstellungen haben sich geändert. Lade den aktuellen Stand.';
  end if;

  if p_action = 'settings' then
    if jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' then
      raise sqlstate 'PT400' using message = 'Ungültige Social-Einstellungen.';
    end if;
    turning_on := (p_payload->>'enabled')::boolean;
    if turning_on and me.enabled then
      foreach category in array array['strength','cardio','nutrition'] loop
        if jsonb_typeof(p_payload->'categories'->category) is distinct from 'boolean' then
          raise sqlstate 'PT400' using message = 'Ungültige Kategorie.';
        end if;
        new_categories := jsonb_set(new_categories, array[category], p_payload->'categories'->category);
      end loop;
    end if;
    update fitness_social_private.profiles set enabled = turning_on, categories = new_categories, revision = revision + 1 where owner = actor;
    delete from fitness_social_private.weeks w where w.owner = actor and not (new_categories->>w.category)::boolean;
    if not (new_categories->>'strength')::boolean then
      delete from fitness_social_private.shares where owner = actor;
    end if;
    return '{}'::jsonb;
  end if;

  if not me.enabled then
    raise sqlstate 'PT403' using message = 'Social ist ausgeschaltet.';
  end if;

  if p_action in ('find','request','accept','decline','cancel','remove','friend') then
    if coalesce(p_payload->>'handle','') !~ '^[A-Za-z0-9_]{3,20}#[0-9]{4}$' then
      raise sqlstate 'PT400' using message = 'Gib einen vollständigen Nutzernamen ein, zum Beispiel Pascal#1298.';
    end if;
    select * into other from fitness_social_private.profiles where lower(handle) = lower(p_payload->>'handle') and enabled;
    if other.owner is null or other.owner = actor then
      raise sqlstate 'PT404' using message = 'Kein passendes Social-Profil gefunden.';
    end if;
    select * into connection from fitness_social_private.friendships
      where first_user = least(actor, other.owner) and second_user = greatest(actor, other.owner);

    if p_action = 'find' then return jsonb_build_object('handle', other.handle); end if;
    if p_action = 'request' then
      insert into fitness_social_private.friendships (first_user, second_user, requester)
      values (least(actor, other.owner), greatest(actor, other.owner), actor) on conflict do nothing;
      if not found then raise sqlstate 'PT409' using message = 'Für dieses Profil besteht bereits eine Freundschaft oder Anfrage.'; end if;
      return '{}'::jsonb;
    end if;
    if p_action = 'accept' then
      update fitness_social_private.friendships set accepted = true
      where id = connection.id and not accepted and requester = other.owner;
      if not found then raise sqlstate 'PT409' using message = 'Diese Freundschaftsanfrage ist nicht mehr offen.'; end if;
      return '{}'::jsonb;
    end if;
    if p_action in ('decline','cancel','remove') then
      delete from fitness_social_private.friendships
      where id = connection.id and (
        (p_action = 'remove' and accepted) or
        (p_action = 'decline' and not accepted and requester = other.owner) or
        (p_action = 'cancel' and not accepted and requester = actor)
      );
      if not found then raise sqlstate 'PT409' using message = 'Diese Anfrage oder Freundschaft wurde bereits geändert.'; end if;
      return '{}'::jsonb;
    end if;
    if connection.accepted is distinct from true then
      raise sqlstate 'PT404' using message = 'Dieses Freundesprofil ist nicht verfügbar.';
    end if;
  end if;

  if p_action in ('friend','stats') then
    week_start := (p_payload->>'week')::date;
    if week_start is null or extract(isodow from week_start) <> 1 or
        abs(week_start - (statement_timestamp() at time zone 'UTC')::date) > 7 then
      raise sqlstate 'PT400' using message = 'Ungültige Kalenderwoche.';
    end if;
  end if;

  if p_action = 'friend' then
    select coalesce(jsonb_object_agg(c.category, case when summary.available then
      jsonb_build_object('count', summary.count, 'total', summary.total) ||
        case when summary.missing > 0 then jsonb_build_object('missing', summary.missing) else '{}'::jsonb end
      else 'null'::jsonb end), '{}') into stats
    from jsonb_each_text(other.categories) c(category, enabled)
    cross join lateral (
      select exists(select 1 from fitness_social_private.weeks w
        where w.owner = other.owner and w.week = week_start and w.category = c.category) as available,
        count(*) as count, count(*) - count(items.units) as missing, coalesce(sum(items.units), 0) as total
      from (
        select distinct on (item->>0) (item->>1)::integer as units
        from fitness_social_private.weeks w cross join lateral jsonb_array_elements(w.entries) item
        where w.owner = other.owner and w.week = week_start and w.category = c.category
        order by item->>0, w.updated_at desc, w.device
      ) items
    ) summary
    where c.enabled = 'true';
    return jsonb_build_object('handle', other.handle, 'week', week_start, 'stats', stats, 'shares', coalesce((
      select jsonb_agg(post) from (
        select jsonb_build_object('name', s.name, 'date', s.date, 'minutes', s.minutes, 'sets', s.sets) as post
        from fitness_social_private.shares s
        where s.owner = other.owner and s.friendship = connection.id and (other.categories->>'strength')::boolean
        order by s.shared_at desc limit 100
      ) posts
    ), '[]'));
  end if;

  if p_action = 'stats' then
    device_id := (p_payload->>'device')::uuid;
    if device_id is null or jsonb_typeof(p_payload->'entries') is distinct from 'object' then
      raise sqlstate 'PT400' using message = 'Ungültige Wochenstatistik.';
    end if;
    for category, week_entries in select * from jsonb_each(p_payload->'entries') loop
      if not coalesce((me.categories->>category)::boolean, false) then
        raise sqlstate 'PT403' using message = 'Diese Kategorie ist privat.';
      end if;
      if jsonb_typeof(week_entries) is distinct from 'array' or jsonb_array_length(week_entries) > 1500 then
        raise sqlstate 'PT400' using message = 'Ungültige Wochenstatistik.';
      end if;
      if exists (
        select 1 from jsonb_array_elements(week_entries) e
        where case when jsonb_typeof(e) <> 'array' then true else
          jsonb_array_length(e) <> 2 or jsonb_typeof(e->0) is distinct from 'string' or
          coalesce(e->>0,'') !~ '^[a-zA-Z0-9:_-]{1,80}$' or
          not ((jsonb_typeof(e->1) = 'number' and coalesce(e->>1,'') ~ '^[0-9]{1,4}$') or
            (category = 'cardio' and jsonb_typeof(e->1) = 'null')) end
      ) then
        raise sqlstate 'PT400' using message = 'Ungültige Werte in der Wochenstatistik.';
      end if;
      insert into fitness_social_private.weeks (owner, device, week, category, entries)
      values (actor, device_id, week_start, category, week_entries)
      on conflict on constraint weeks_pkey do update set entries = excluded.entries, updated_at = statement_timestamp();
    end loop;
    delete from fitness_social_private.weeks where owner = actor and week < week_start - 7;
    return '{}'::jsonb;
  end if;

  if p_action = 'share' then
    if not (me.categories->>'strength')::boolean then
      raise sqlstate 'PT403' using message = 'Gib zuerst Krafttraining in den Social-Einstellungen frei.';
    end if;
    workout_id := (p_payload->>'id')::uuid;
    workout_name := btrim(p_payload->>'name');
    workout_date := (p_payload->>'date')::date;
    workout_minutes := (p_payload->>'minutes')::integer;
    workout_sets := (p_payload->>'sets')::integer;
    if workout_id is null or workout_name is null or char_length(workout_name) not between 1 and 100 or
        workout_date is null or workout_date < date '2000-01-01' or workout_date > current_date + 1 or
        workout_minutes is null or workout_minutes not between 0 and 1440 or
        workout_sets is null or workout_sets not between 0 and 1000 or
        jsonb_typeof(p_payload->'recipients') is distinct from 'array' then
      raise sqlstate 'PT400' using message = 'Ungültige Trainingsfreigabe.';
    end if;
    requested_count := jsonb_array_length(p_payload->'recipients');
    if requested_count not between 1 and 25 then raise sqlstate 'PT400' using message = 'Wähle 1–25 Freunde aus.'; end if;
    select array_agg(f.id) into selected_friends
    from fitness_social_private.friendships f
    join fitness_social_private.profiles p on p.owner = case when f.first_user = actor then f.second_user else f.first_user end
    where actor in (f.first_user, f.second_user) and f.accepted and p.enabled and lower(p.handle) in
      (select lower(value) from jsonb_array_elements_text(p_payload->'recipients'));
    if cardinality(selected_friends) is distinct from requested_count then
      raise sqlstate 'PT403' using message = 'Teilen ist nur mit ausgewählten, bestätigten Freunden möglich.';
    end if;
    update fitness_social_private.shares set name = workout_name, date = workout_date, minutes = workout_minutes, sets = workout_sets
      where owner = actor and source_id = workout_id;
    insert into fitness_social_private.shares (owner, source_id, friendship, name, date, minutes, sets)
    select actor, workout_id, f.id, workout_name, workout_date, workout_minutes, workout_sets
    from fitness_social_private.friendships f where f.id = any(selected_friends) and f.accepted
    on conflict do nothing;
    return '{}'::jsonb;
  end if;

  if p_action = 'withdraw' then
    delete from fitness_social_private.shares where owner = actor and source_id = (p_payload->>'id')::uuid;
    return '{}'::jsonb;
  end if;

  raise sqlstate 'PT400' using message = 'Unbekannte Social-Aktion.';
end;
$$;

revoke all on function public.fitness_social(text,jsonb) from public, anon, authenticated;
grant execute on function public.fitness_social(text,jsonb) to authenticated;

commit;
