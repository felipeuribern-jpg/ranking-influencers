# Arquitectura

## Flujo diario

```
GitHub Actions (cron 06:00 UTC)
  └─ pipeline/run.ts
       1. Lee data/influencers.json, data/manual.json, data/resolved.json
       2. Consulta YouTube, Instagram, Facebook, TikTok (tokens vinculados)
       3. Lee votos de los últimos 30 días desde Supabase (service_role)
       4. Calcula puntos (pipeline/score.ts, ver FORMULA.md)
       5. Escribe data/ranking.json y data/history/AAAA-MM-DD.json
       6. Valida (npm run validate) → si falla, NO hace commit y abre un issue
       7. Commit + push → dispara el build de Astro → GitHub Pages
```

## Estructura del repositorio

```
/
├─ CLAUDE.md
├─ site.config.ts            # brandName, domain, tagline, idiomas, país por defecto
├─ docs/                     # estos documentos + prototipo.html
├─ data/
│  ├─ influencers.json       # perfiles (editado a mano o por PR)
│  ├─ manual.json            # cifras manuales (LinkedIn, Snapchat, respaldos)
│  ├─ resolved.json          # channelId de YouTube ya resueltos (lo escribe el pipeline)
│  ├─ ranking.json           # salida diaria que consume el sitio
│  └─ history/               # una instantánea por día
├─ i18n/                     # es.json, en.json, … (textos de interfaz)
├─ pipeline/
│  ├─ run.ts  config.ts  score.ts  score.test.ts  validate.ts
│  └─ sources/ youtube.ts instagram.ts facebook.ts tiktok.ts manual.ts
├─ src/                      # sitio Astro
│  ├─ pages/[lang]/index.astro, pais/[cc].astro, p/[id].astro, metodo.astro, creador.astro
│  ├─ components/            # RankingRow, CountryPicker, LikeButton, LangSwitcher…
│  └─ lib/supabase.ts        # cliente con anon key
├─ supabase/
│  └─ schema.sql
└─ .github/workflows/
   ├─ update.yml             # cron diario
   ├─ deploy.yml             # build + GitHub Pages en cada push a main
   └─ ci.yml                 # test + validate en cada PR
```

## Formato de `data/ranking.json`

```json
{
  "generatedAt": "2026-10-01T06:04:12Z",
  "medians": { "youtube": 2.1, "instagram": 1.3, "tiktok": 4.0 },
  "people": [
    {
      "id": "kimberly-loaiza",
      "rank": 1, "rankPrev": 2, "countryRank": 1, "countryRankPrev": 1,
      "total": 11910.4, "networkPoints": 10912.0, "publicPoints": 998.4, "votes30": 1520,
      "mainPlatform": "tiktok",
      "platforms": {
        "tiktok": { "followers": 83800000, "followers30": 82100000, "er": 3.9,
                    "points": 4923.1, "stale": false,
                    "source": "tiktok-display-api", "fetchedAt": "2026-10-01T06:01:55Z",
                    "url": "https://www.tiktok.com/@..." }
      }
    }
  ]
}
```

## Supabase: `supabase/schema.sql`

```sql
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
```

Revisa el esquema con Supabase actual (vistas con `security_invoker`, cifrado con
`pgsodium`/Vault) antes de aplicarlo. `influencer_id` debe validarse contra la lista de ids
(por ejemplo con una tabla `influencers(id)` que el pipeline sincroniza a diario).

## Coste

Todo en planes gratuitos: GitHub (Actions y Pages en repositorio público), Supabase free,
cuotas gratuitas de Google y Meta. El dominio `.com` es el único gasto previsto.
