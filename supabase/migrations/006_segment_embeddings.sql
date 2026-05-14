-- Optional semantic retrieval storage for transcript segments.
-- Vectors can be populated by a future embedding worker; keyword search remains the default path.

create extension if not exists vector;

create table if not exists public.segment_embeddings (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  segment_index integer not null,
  transcript_id uuid references public.transcripts(id) on delete cascade,
  embedding_model text not null default 'text-embedding-3-small',
  dimensions integer not null default 1536,
  embedding vector(1536),
  text_hash text,
  embedded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint segment_embeddings_video_segment_key unique (video_id, segment_index, embedding_model)
);

create index if not exists segment_embeddings_video_id_idx
  on public.segment_embeddings (video_id);

create index if not exists segment_embeddings_model_idx
  on public.segment_embeddings (embedding_model, embedded_at desc);

create index if not exists segment_embeddings_transcript_id_idx
  on public.segment_embeddings (transcript_id);

-- Metadata-only rows are allowed before vectors are generated.
create index if not exists segment_embeddings_pending_idx
  on public.segment_embeddings (embedded_at)
  where embedding is null;

do $$
begin
  execute 'create index if not exists segment_embeddings_vector_idx on public.segment_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100)';
exception
  when others then
    raise notice 'segment_embeddings_vector_idx skipped: %', sqlerrm;
end;
$$;

create trigger segment_embeddings_set_updated_at
before update on public.segment_embeddings
for each row execute function public.set_updated_at_timestamp();

-- Placeholder RPC for future vector search. Returns no rows until embeddings exist.
create or replace function public.search_segment_embeddings(
  search_query text,
  result_limit integer default 20
)
returns table (
  video_id text,
  segment_index integer,
  start_seconds numeric,
  text text,
  similarity double precision
)
language plpgsql
stable
as $$
begin
  return query
  select
    se.video_id,
    se.segment_index,
    ts.start_seconds,
    ts.text,
    0::double precision as similarity
  from public.segment_embeddings se
  join public.transcript_segments ts
    on ts.video_id = se.video_id
   and ts.segment_index = se.segment_index
  where se.embedding is not null
    and search_query is not null
    and length(trim(search_query)) > 0
  order by se.embedded_at desc nulls last
  limit 0;
end;
$$;

grant select on public.segment_embeddings to authenticated, service_role;
grant insert, update, delete on public.segment_embeddings to service_role;
