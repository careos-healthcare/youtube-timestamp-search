-- Upgrade segment embedding vector search for Phase 12

create extension if not exists vector;

alter table public.segment_embeddings
  add column if not exists start_seconds numeric;

create index if not exists segment_embeddings_start_seconds_idx
  on public.segment_embeddings (video_id, start_seconds);

create index if not exists segment_embeddings_text_hash_idx
  on public.segment_embeddings (embedding_model, text_hash);

drop function if exists public.search_segment_embeddings(text, integer);

create or replace function public.search_segment_embeddings(
  query_embedding vector(1536),
  match_count integer default 20,
  min_similarity double precision default 0.25,
  embedding_model text default 'text-embedding-3-small'
)
returns table (
  video_id text,
  segment_index integer,
  start_seconds numeric,
  text text,
  similarity double precision
)
language sql
stable
as $$
  select
    se.video_id,
    se.segment_index,
    coalesce(se.start_seconds, ts.start_seconds) as start_seconds,
    ts.text,
    (1 - (se.embedding <=> query_embedding))::double precision as similarity
  from public.segment_embeddings se
  inner join public.transcript_segments ts
    on ts.video_id = se.video_id
   and ts.segment_index = se.segment_index
  where se.embedding is not null
    and se.embedding_model = search_segment_embeddings.embedding_model
    and (1 - (se.embedding <=> query_embedding)) >= min_similarity
  order by se.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.search_segment_embeddings(vector, integer, double precision, text)
  to authenticated, service_role;
