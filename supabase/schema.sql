-- Esquema base (docs/ARQUITECTURA.md, Fase 5 de docs/PLAN_DE_TRABAJO.md).
-- Propuesta versionada: se aplica recién cuando exista el proyecto de Supabase.
-- Revisar contra la versión vigente de Supabase (vistas con security_invoker,
-- cifrado con pgsodium/Vault) antes de aplicar en producción.

create table public.votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  influencer_id text not null,
  day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (user_id, influencer_id, day)
);
alter table public.votes enable row level security;

-- Cada usuario solo puede insertar su propio voto y solo para hoy.
create policy "votar hoy" on public.votes for insert to authenticated
  with check (auth.uid() = user_id and day = (now() at time zone 'utc')::date);

-- Cada usuario puede ver sus propios votos (para saber si ya votó hoy).
create policy "ver mis votos" on public.votes for select to authenticated
  using (auth.uid() = user_id);

-- Contadores públicos sin exponer quién votó.
create view public.vote_counts_30d with (security_invoker = false) as
  select influencer_id, count(*)::int as votes30
  from public.votes
  where day > (now() at time zone 'utc')::date - 30
  group by influencer_id;
grant select on public.vote_counts_30d to anon, authenticated;

-- Tokens de TikTok de creadores vinculados: sin políticas → solo service_role.
create table public.creator_tokens (
  influencer_id text primary key,
  platform text not null default 'tiktok',
  refresh_token_encrypted text not null,
  updated_at timestamptz not null default now()
);
alter table public.creator_tokens enable row level security;
