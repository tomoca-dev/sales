-- Fix Supabase profile 500 errors and install the sales import audit table.
-- Safe to run multiple times in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'Customer',
  phone text,
  address text,
  tin text,
  account_number text,
  wallet_balance numeric not null default 0,
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists tin text;
alter table public.profiles add column if not exists account_number text;
alter table public.profiles add column if not exists wallet_balance numeric not null default 0;
alter table public.profiles add column if not exists loyalty_points integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles alter column role set default 'Customer';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role in ('Sales Rep','Admin','Payment Collector','Factory/Ops','Marketing','Management','Customer','Driver')
);

create table if not exists public.tomoca_platform_entities (
  entity_type text not null,
  entity_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

create index if not exists tomoca_platform_entities_type_idx
  on public.tomoca_platform_entities(entity_type);
create index if not exists tomoca_platform_entities_data_gin_idx
  on public.tomoca_platform_entities using gin(data);

create table if not exists public.sales_document_imports (
  id uuid primary key default gen_random_uuid(),
  source_file_name text not null,
  source_file_hash text not null,
  status text not null check (status in ('Parsed','Imported','Duplicate','Failed')),
  document jsonb,
  order_id text,
  error_message text,
  imported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_document_imports_hash_idx
  on public.sales_document_imports(source_file_hash);
create index if not exists sales_document_imports_status_idx
  on public.sales_document_imports(status);
create unique index if not exists sales_document_imports_one_imported_hash_idx
  on public.sales_document_imports(source_file_hash)
  where status = 'Imported';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tomoca_platform_entities_set_updated_at on public.tomoca_platform_entities;
create trigger tomoca_platform_entities_set_updated_at
before update on public.tomoca_platform_entities
for each row execute function public.set_updated_at();

drop trigger if exists sales_document_imports_set_updated_at on public.sales_document_imports;
create trigger sales_document_imports_set_updated_at
before update on public.sales_document_imports
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'User'),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'Customer')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper retained for older policies, but the active profile policy below does not depend on it.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.tomoca_platform_entities enable row level security;
alter table public.sales_document_imports enable row level security;

-- Remove all existing profile policies because old recursive policies can cause HTTP 500.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;
end $$;

-- Non-recursive profile access. Users can read themselves; Admin/Management can read by JWT metadata.
create policy profiles_select_self_or_jwt_management on public.profiles
for select to authenticated
using (
  auth.uid() = id
  or coalesce(
    auth.jwt()->'app_metadata'->>'role',
    auth.jwt()->'user_metadata'->>'role',
    ''
  ) in ('Admin','Management')
);

create policy profiles_update_self_limited on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

revoke insert on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, address) on public.profiles to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tomoca_platform_entities'
  loop
    execute format('drop policy if exists %I on public.tomoca_platform_entities', policy_record.policyname);
  end loop;
end $$;

create policy tomoca_entities_read_authenticated on public.tomoca_platform_entities
for select to authenticated
using (true);

revoke insert, update, delete on public.tomoca_platform_entities from authenticated;
grant select on public.tomoca_platform_entities to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sales_document_imports'
  loop
    execute format('drop policy if exists %I on public.sales_document_imports', policy_record.policyname);
  end loop;
end $$;

create policy sales_document_imports_read_authorized on public.sales_document_imports
for select to authenticated
using (
  imported_by = auth.uid()
  or coalesce(
    auth.jwt()->'app_metadata'->>'role',
    auth.jwt()->'user_metadata'->>'role',
    ''
  ) in ('Sales Rep','Admin','Management','Payment Collector')
);

revoke insert, update, delete on public.sales_document_imports from authenticated;
grant select on public.sales_document_imports to authenticated;

-- Refresh PostgREST cache.
notify pgrst, 'reload schema';

select 'Tomoca Supabase profile/API repair completed' as result;
