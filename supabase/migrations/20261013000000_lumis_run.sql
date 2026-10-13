-- Lumis Run 3D: ranking online do jogo do stand.
-- Tudo passa pela função de servidor "lumis-run" (chave service_role).
-- RLS ligado e nenhuma política: o navegador não lê nem grava nada direto.

create table if not exists public.lumis_tickets (
  id uuid primary key default gen_random_uuid(),
  seed bigint not null check (seed between 0 and 4294967295),
  issued_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists lumis_tickets_issued_idx on public.lumis_tickets (issued_at);

-- dados pessoais: nome + WhatsApp (só a equipe vê, pela função)
create table if not exists public.lumis_players (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  public_id text not null unique,
  name text not null check (char_length(name) between 2 and 20),
  phone text not null check (phone ~ '^[0-9]{10,11}$'),
  photo_version bigint,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);

create table if not exists public.lumis_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.lumis_players (id) on delete cascade,
  ticket_id uuid references public.lumis_tickets (id) on delete set null,
  seed bigint not null,
  status text not null check (status in ('valid', 'review', 'rejected')),
  reason text,
  score integer not null,
  distance double precision not null,
  books integer not null,
  duration_ms integer not null,
  commands jsonb not null,
  game_version text,
  submitted_at timestamptz not null default now()
);
create index if not exists lumis_runs_player_idx on public.lumis_runs (player_id, status);

alter table public.lumis_tickets enable row level security;
alter table public.lumis_players enable row level security;
alter table public.lumis_runs enable row level security;
revoke all on public.lumis_tickets, public.lumis_players, public.lumis_runs from anon, authenticated;

-- usa o bilhete uma vez só (válido por 24 h)
create or replace function public.lumis_consume_ticket(p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  update lumis_tickets set used_at = now()
  where id = p_id and used_at is null and issued_at > now() - interval '24 hours'
  returning jsonb_build_object('seed', seed, 'issuedAt', (extract(epoch from issued_at) * 1000)::bigint);
$$;

-- a melhor partida de cada pessoa em cada critério (a ordem final é feita na função)
create or replace function public.lumis_best_runs()
returns jsonb language sql stable security definer set search_path = public as $$
  with s as (
    select distinct on (r.player_id) 'score' as kind, r.*
    from lumis_runs r where r.status = 'valid'
    order by r.player_id, r.score desc, r.distance desc, r.books desc, r.duration_ms asc, r.submitted_at asc
  ), b as (
    select distinct on (r.player_id) 'books' as kind, r.*
    from lumis_runs r where r.status = 'valid'
    order by r.player_id, r.books desc, r.duration_ms asc, r.score desc, r.submitted_at asc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', x.kind, 'publicId', p.public_id, 'name', p.name, 'photo', p.photo_version,
    'score', x.score, 'distance', x.distance, 'books', x.books, 'durationMs', x.duration_ms,
    'at', (extract(epoch from x.submitted_at) * 1000)::bigint)), '[]'::jsonb)
  from (select * from s union all select * from b) x join lumis_players p on p.id = x.player_id;
$$;

-- todas as partidas com o contato, para a área da equipe
create or replace function public.lumis_staff_runs()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'status', r.status, 'reason', r.reason, 'publicId', p.public_id, 'name', p.name, 'phone', p.phone,
    'photo', p.photo_version, 'score', r.score, 'distance', r.distance, 'books', r.books, 'durationMs', r.duration_ms,
    'seed', r.seed, 'at', (extract(epoch from r.submitted_at) * 1000)::bigint) order by r.submitted_at), '[]'::jsonb)
  from lumis_runs r join lumis_players p on p.id = r.player_id;
$$;

create or replace function public.lumis_clear()
returns void language sql security definer set search_path = public as $$
  delete from lumis_runs where true;
  delete from lumis_players where true;
  delete from lumis_tickets where true;
$$;

-- bilhetes que ninguém usou somem depois de 2 dias
create or replace function public.lumis_prune_tickets()
returns void language sql security definer set search_path = public as $$
  delete from lumis_tickets where issued_at < now() - interval '2 days';
$$;

revoke all on function public.lumis_consume_ticket(uuid), public.lumis_best_runs(), public.lumis_staff_runs(), public.lumis_clear(), public.lumis_prune_tickets() from public, anon, authenticated;
grant execute on function public.lumis_consume_ticket(uuid), public.lumis_best_runs(), public.lumis_staff_runs(), public.lumis_clear(), public.lumis_prune_tickets() to service_role;
