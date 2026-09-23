-- Propuesta de esquema para docs/MODELO_DE_NEGOCIOS.md — NO aplicada todavía.
-- Se aplica recién cuando exista el proyecto real de Supabase (Fase 5 de
-- docs/PLAN_DE_TRABAJO.md, sigue bloqueada). Extiende supabase/schema.sql sin
-- modificarlo: `votes` y `creator_tokens` no cambian.
--
-- Regla que ninguna tabla de este archivo puede romper (docs/MODELO_DE_NEGOCIOS.md):
-- ningún plan, suscripción, reclamo o patrocinio puede alterar el ranking. Por
-- eso ninguna tabla de acá referencia `data/ranking.json` ni escribe puntos: el
-- pipeline (pipeline/run.ts) nunca lee estas tablas. Solo `vote_counts_30d`
-- (supabase/schema.sql) influye en el cálculo, y ya tiene su propio tope del 10%
-- en pipeline/score.ts.

-- Sincronizada a diario por el pipeline desde data/influencers.json: existe solo
-- para poder referenciar `influencer_id` con integridad referencial desde las
-- tablas de abajo (docs/ARQUITECTURA.md ya lo señalaba como pendiente).
create table public.influencers (
  id text primary key,
  synced_at timestamptz not null default now()
);
alter table public.influencers enable row level security;
create policy "influencers son públicos" on public.influencers for select
  to anon, authenticated using (true);
-- Sin política de insert/update/delete: solo la escribe el pipeline (service_role).

-- Perfil de cuenta de un usuario autenticado (creador, marca o agencia).
create table public.account_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.account_profiles enable row level security;
create policy "ver mi cuenta" on public.account_profiles for select
  to authenticated using (auth.uid() = id);
create policy "editar mi cuenta" on public.account_profiles for update
  to authenticated using (auth.uid() = id);

-- Reclamo de perfil por parte de un creador (ESPECIFICACION.md §5, "Soy este
-- creador"). La aprobación es manual (service_role); nunca automática.
create table public.profile_claims (
  id uuid primary key default gen_random_uuid(),
  influencer_id text not null references public.influencers(id),
  claimant_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  evidence text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.profile_claims enable row level security;
create policy "pedir mi reclamo" on public.profile_claims for insert
  to authenticated with check (auth.uid() = claimant_id);
create policy "ver mis reclamos" on public.profile_claims for select
  to authenticated using (auth.uid() = claimant_id);
-- Sin política de update pública: solo service_role aprueba/rechaza.

-- Marcas y agencias que operan como equipo.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  primary key (organization_id, user_id)
);
alter table public.organization_members enable row level security;
create policy "ver mi organización" on public.organizations for select
  to authenticated using (
    id in (select organization_id from public.organization_members where user_id = auth.uid())
  );
create policy "ver mi membresía" on public.organization_members for select
  to authenticated using (
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

-- Suscripciones (Creador Verificado/Pro, Brand Starter, Agency Pro, Enterprise —
-- src/config/plans.config.ts). Sin proveedor de pagos conectado todavía: el
-- estado lo escribe service_role a mano o un webhook futuro, nunca el cliente.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  account_profile_id uuid references public.account_profiles(id) on delete cascade,
  plan_id text not null,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  constraint subscriptions_owner_check check (
    (organization_id is not null and account_profile_id is null) or
    (organization_id is null and account_profile_id is not null)
  )
);
alter table public.subscriptions enable row level security;
create policy "ver mi suscripción" on public.subscriptions for select
  to authenticated using (
    account_profile_id = auth.uid()
    or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

-- Permisos derivados del plan (límites, features), sin lógica duplicada en el
-- frontend — ver src/lib/entitlements.ts (Fase siguiente, no implementado acá).
create table public.entitlements (
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  feature_key text not null,
  limit_value integer,
  primary key (subscription_id, feature_key)
);
alter table public.entitlements enable row level security;
create policy "ver mis entitlements" on public.entitlements for select
  to authenticated using (
    subscription_id in (
      select id from public.subscriptions
      where account_profile_id = auth.uid()
         or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
    )
  );

-- Listas guardadas (marcas/agencias comparando perfiles).
create table public.saved_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.saved_lists enable row level security;
create policy "gestionar mis listas" on public.saved_lists for all
  to authenticated using (
    owner_id = auth.uid()
    or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

create table public.saved_list_items (
  list_id uuid not null references public.saved_lists(id) on delete cascade,
  influencer_id text not null references public.influencers(id),
  added_at timestamptz not null default now(),
  primary key (list_id, influencer_id)
);
alter table public.saved_list_items enable row level security;
create policy "gestionar items de mis listas" on public.saved_list_items for all
  to authenticated using (
    list_id in (
      select id from public.saved_lists
      where owner_id = auth.uid()
         or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
    )
  );

-- Exportaciones (CSV/informe). El archivo lo genera un proceso aparte;
-- esta tabla solo registra el pedido y su estado.
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  kind text not null,
  status text not null default 'queued' check (status in ('queued', 'ready', 'failed')),
  file_url text,
  created_at timestamptz not null default now()
);
alter table public.exports enable row level security;
create policy "ver mis exportaciones" on public.exports for select
  to authenticated using (
    requested_by = auth.uid()
    or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );
create policy "pedir una exportación" on public.exports for insert
  to authenticated with check (requested_by = auth.uid());

-- Espacios patrocinados con etiqueta obligatoria. A propósito NO tiene columna
-- de influencer_id ni de puntos: un patrocinio nunca puede señalar "este perfil
-- está patrocinado" de forma que afecte su lectura en el ranking.
create table public.sponsorships (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  placement text not null,
  disclosure_text text not null,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);
alter table public.sponsorships enable row level security;
create policy "patrocinios son públicos" on public.sponsorships for select
  to anon, authenticated using (true);
-- Sin política de insert/update: solo service_role gestiona patrocinios.

-- Disputas de datos (ESPECIFICACION.md §5, corrección de errores factuales —
-- siempre gratis, no requiere plan de pago).
create table public.data_disputes (
  id uuid primary key default gen_random_uuid(),
  influencer_id text not null references public.influencers(id),
  reported_by uuid references auth.users(id),
  description text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.data_disputes enable row level security;
create policy "reportar una disputa" on public.data_disputes for insert
  to authenticated with check (reported_by = auth.uid());
create policy "ver mis disputas" on public.data_disputes for select
  to authenticated using (reported_by = auth.uid());

-- Auditoría de acciones sensibles (aprobar reclamos, cambiar planes, resolver
-- disputas). Sin políticas → solo legible/escribible con service_role, igual
-- que creator_tokens en supabase/schema.sql.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
