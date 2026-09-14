-- Reitbahn — initiales Schema
-- Ausführen im Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Status: in der Instanz angewendet (alle Tabellen und Funktionen verifiziert).

create extension if not exists vector;

-- ---------------------------------------------------------------- Nutzerdaten

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  level       text,                       -- E / A / L / M / S
  goals       text,
  created_at  timestamptz not null default now()
);

create table horses (
  id              uuid primary key default gen_random_uuid(),
  owner           uuid not null references profiles on delete cascade,
  name            text not null,
  age             int check (age between 0 and 40),
  breed           text,
  training_level  text,                   -- E / A / L / M / S
  temperament     jsonb  not null default '{}'::jsonb,   -- z.B. {"sensitiv":4}
  known_issues    text[] not null default '{}',          -- z.B. {"stellt sich links schwer"}
  created_at      timestamptz not null default now()
);

create table videos (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references profiles on delete cascade,
  horse_id      uuid references horses on delete set null,
  storage_path  text not null,            -- Pfad im Supabase-Storage-Bucket
  duration_s    numeric check (duration_s > 0),
  discipline    text,
  created_at    timestamptz not null default now()
);

create table analyses (
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid not null references videos on delete cascade,
  observations  jsonb not null default '[]'::jsonb,  -- [{claim, confidence, t_start, t_end}]
  feedback      text,
  sources       jsonb not null default '[]'::jsonb,  -- belegende chunk-ids
  cost_cents    numeric not null default 0,
  created_at    timestamptz not null default now()
);

create index on horses   (owner);
create index on videos   (owner);
create index on analyses (video_id);

-- ------------------------------------------------------------ Wissensbasis

-- Dimension richtet sich nach dem Embedding-Modell:
--   openai/text-embedding-3-small = 1536 (verifiziert gegen OpenRouter).
-- Bei Wechsel des Modells muss diese Zahl mitgeändert werden.
create table chunks (
  id         bigserial primary key,
  content    text not null,
  embedding  vector(1536),
  tsv        tsvector,
  language   text not null default 'german' check (language in ('german','english')),
  metadata   jsonb not null default '{}'::jsonb,
  -- metadata: lesson, section, page, pageEnd, source, strategy
  created_at timestamptz not null default now()
);

-- tsv kann keine generated column sein: die Textsuch-Konfiguration ist variabel
-- (gemischter DE/EN-Korpus) und damit nicht immutable. Daher per Trigger.
create or replace function chunks_tsv_update() returns trigger
language plpgsql as $$
begin
  new.tsv := to_tsvector(new.language::regconfig, coalesce(new.content, ''));
  return new;
end;
$$;

create trigger chunks_tsv_trigger
  before insert or update of content, language on chunks
  for each row execute function chunks_tsv_update();

-- HNSW statt IVFFlat: braucht keine Trainingsdaten und ist bei dieser
-- Korpusgröße direkt nach dem Ingest einsatzbereit.
create index on chunks using hnsw (embedding vector_cosine_ops);
create index on chunks using gin  (tsv);
create index on chunks using gin  (metadata jsonb_path_ops);

-- ------------------------------------------------------- Row Level Security

alter table profiles alter column id set default auth.uid();

alter table profiles enable row level security;
alter table horses   enable row level security;
alter table videos   enable row level security;
alter table analyses enable row level security;
alter table chunks   enable row level security;

-- Jede Reiterin sieht ausschliesslich ihr eigenes Profil.
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Pferde und Videos: nur die eigenen.
create policy "own horses" on horses
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create policy "own videos" on videos
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- Analysen haengen am Video; die Besitzpruefung laeuft ueber dieses.
create policy "own analyses" on analyses
  for all
  using      (exists (select 1 from videos v where v.id = video_id and v.owner = auth.uid()))
  with check (exists (select 1 from videos v where v.id = video_id and v.owner = auth.uid()));

-- Die Reitlehre ist gemeinsame Referenz: fuer alle Angemeldeten lesbar.
-- Bewusst KEINE Insert-Policy: geschrieben wird nur vom Ingest-Script mit dem
-- Secret Key, der RLS umgeht. Damit kann niemand ueber die App Chunks in die
-- Wissensbasis einschmuggeln (verifiziert: INSERT mit Publishable Key -> 401).
create policy "read corpus" on chunks
  for select to authenticated using (true);

-- ---------------------------------------------------------------- Retrieval

-- Vektorsuche. Wird aus lib/retrieval/vector.ts per rpc() aufgerufen.
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count     int   default 10,
  filter          jsonb default '{}'::jsonb
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable as $$
  select c.id, c.content, c.metadata,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.metadata @> filter
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Lexikalische Suche (ts_rank, tf-idf-artig -- ausdruecklich NICHT BM25).
create or replace function search_chunks_text(
  query_text  text,
  lang        text  default 'german',
  match_count int   default 10,
  filter      jsonb default '{}'::jsonb
)
returns table (id bigint, content text, metadata jsonb, rank float)
language sql stable as $$
  select c.id, c.content, c.metadata,
         ts_rank(c.tsv, websearch_to_tsquery(lang::regconfig, query_text)) as rank
  from chunks c
  where c.tsv @@ websearch_to_tsquery(lang::regconfig, query_text)
    and c.metadata @> filter
  order by rank desc
  limit match_count;
$$;
