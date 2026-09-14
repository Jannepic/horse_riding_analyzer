-- Reitbahn — Migration 0002
-- Status: NOCH NICHT ANGEWENDET. Im Supabase SQL Editor ausfuehren.
--
-- Fix: search_chunks_text() nutzte `lang` nur fuer das Stemming, durchsuchte
-- aber weiterhin ALLE Chunks. Ein Aufruf mit lang = 'english' lieferte deshalb
-- deutsche Treffer, bewertet mit englischem Stemming — also Zufall.
-- Gemessen: alle fuenf Treffer des englischen Arms kamen aus dem deutschen
-- Dokument.
--
-- Ab jetzt bedeutet der Parameter: "durchsuche die Chunks dieser Sprache mit
-- dem Stemming dieser Sprache". NULL sucht ueber alle Sprachen.

create or replace function search_chunks_text(
  query_text  text,
  lang        text  default 'german',
  match_count int   default 10,
  filter      jsonb default '{}'::jsonb
)
returns table (id bigint, content text, metadata jsonb, language text, rank float)
language sql stable as $$
  select c.id, c.content, c.metadata, c.language,
         ts_rank(c.tsv, websearch_to_tsquery(lang::regconfig, query_text)) as rank
  from chunks c
  where c.tsv @@ websearch_to_tsquery(lang::regconfig, query_text)
    and c.metadata @> filter
    and (lang is null or c.language = lang)
  order by rank desc
  limit match_count;
$$;

-- Der Vektor-Arm gibt die Sprache jetzt ebenfalls zurueck, damit das
-- Quellenpanel kennzeichnen kann, aus welcher Sprache ein Beleg stammt.
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count     int   default 10,
  filter          jsonb default '{}'::jsonb
)
returns table (id bigint, content text, metadata jsonb, language text, similarity float)
language sql stable as $$
  select c.id, c.content, c.metadata, c.language,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.metadata @> filter
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
