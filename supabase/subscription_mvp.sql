-- Run this migration in Supabase SQL Editor.
create table if not exists public.subscription_orders (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null,
  duration text not null,
  amount numeric not null,
  payment_method text not null check (payment_method in ('cash', 'ccp')),
  payment_reference text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'verification', 'confirmed', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid references public.profiles(id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.subscription_orders(id),
  plan text not null,
  status text not null default 'active' check (status in ('active', 'expired')),
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_by uuid references public.profiles(id)
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings(key, value)
values ('contact', '{"whatsapp":"", "phone":"", "countdown":true, "expiryNotifications":true, "ccp":""}'::jsonb)
on conflict (key) do nothing;

alter table public.subscription_orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.platform_settings enable row level security;

grant usage on schema public to anon, authenticated;
grant all privileges on table public.subscription_orders to anon, authenticated;
grant all privileges on table public.subscriptions to anon, authenticated;
grant all privileges on table public.platform_settings to anon, authenticated;
grant select, update on table public.profiles to anon, authenticated;

drop policy if exists subscription_orders_mvp_access on public.subscription_orders;
create policy subscription_orders_mvp_access
  on public.subscription_orders for all
  using (true) with check (true);

drop policy if exists subscriptions_mvp_access on public.subscriptions;
create policy subscriptions_mvp_access
  on public.subscriptions for all
  using (true) with check (true);

drop policy if exists platform_settings_mvp_access on public.platform_settings;
create policy platform_settings_mvp_access
  on public.platform_settings for all
  using (true) with check (true);

drop policy if exists profiles_mvp_subscription_access on public.profiles;
create policy profiles_mvp_subscription_access
  on public.profiles for select
  using (true);

drop policy if exists profiles_mvp_subscription_update on public.profiles;
create policy profiles_mvp_subscription_update
  on public.profiles for update
  using (true) with check (true);

-- Ces politiques ouvertes sont adaptées au MVP actuel, qui utilise une connexion
-- applicative personnalisée. Remplace-les par des politiques auth.uid() avant production.
