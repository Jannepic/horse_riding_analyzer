-- Reitbahn — Migration 0003
-- Status: NOCH NICHT ANGEWENDET. Im Supabase SQL Editor ausfuehren.
--
-- Zwei Aenderungen, die zusammengehoeren:
--
-- 1. Konversationen werden dauerhaft gespeichert, damit der Verlauf einen Reload
--    ueberlebt und das Gedaechtnis des Agenten aus der Datenbank kommt statt aus
--    einem prozesslokalen MemorySaver.
--
-- 2. Videos werden NICHT in Supabase gespeichert. Der Clip geht direkt vom
--    Browser an die Analyse-Route. Von dort legt der lokale Next.js-Prozess ihn
--    in einen Ordner je Konversation auf der PLATTE DER NUTZERIN ab
--    (web/data/videos/<conversation-id>/), und die Datenbank haelt nur den
--    Dateinamen. Damit ist der Chatverlauf die Trainingshistorie, das Video
--    bleibt ansehbar, und es liegt trotzdem nie auf einem fremden Server.

-- ---------------------------------------------------------------- Konversationen

create table conversations (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references profiles on delete cascade,
  horse_id    uuid references horses on delete set null,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations on delete cascade,
  -- "observation" sind die Beobachtungen aus einem Video: weder Frage der
  -- Nutzerin noch Antwort des Modells, sondern Datenmaterial.
  role             text not null check (role in ('user', 'assistant', 'observation')),
  content          text not null,
  -- Belege, Tool-Rueckgaben und Verbrauch der Runde, fuer die Wiederanzeige.
  sources          jsonb not null default '[]'::jsonb,
  tool_results     jsonb not null default '[]'::jsonb,
  usage            jsonb,
  -- Dateiname im lokalen Ordner der Konversation, z.B. "<message-id>.mp4".
  -- Bewusst nur der NAME, kein Pfad: den Pfad baut der Server aus der
  -- conversation_id, damit aus der Datenbank kein Verzeichniswechsel moeglich ist.
  video_file       text,
  -- Originalname, nur zur Anzeige ("IMG.mp4").
  video_name       text,
  created_at       timestamptz not null default now()
);

create index on conversations (owner, updated_at desc);
create index on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages       enable row level security;

create policy "own conversations" on conversations
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- Nachrichten haengen an der Konversation; die Besitzpruefung laeuft ueber diese.
create policy "own messages" on messages
  for all
  using (exists (
    select 1 from conversations c where c.id = conversation_id and c.owner = auth.uid()
  ))
  with check (exists (
    select 1 from conversations c where c.id = conversation_id and c.owner = auth.uid()
  ));

-- ------------------------------------------------- Videospeicherung entfaellt

-- Beide Tabellen sind leer und werden durch conversations/messages ersetzt.
-- `analyses` zuerst, sie referenziert `videos`.
drop table if exists analyses;
drop table if exists videos;

-- Der Storage-Bucket "videos" wird damit ebenfalls nicht mehr gebraucht. Er kann
-- im Dashboard geloescht werden; Policies waren dort nie angelegt (POLICIES 0),
-- weshalb ein Browser-Upload ohnehin mit
-- "new row violates row-level security policy" abgewiesen wurde.
