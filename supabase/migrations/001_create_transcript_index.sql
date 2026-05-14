-- Transcript index persistence for YouTube Timestamp Search
-- Run in the Supabase SQL editor or via the Supabase CLI.

create extension if not exists pg_trgm;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  video_url text,
  title text,
  channel_name text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transcripts_video_id_key unique (video_id)
);

create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  video_id text not null,
  segment_index integer not null,
  text text not null,
  start_seconds numeric,
  duration_seconds numeric,
  created_at timestamptz not null default now(),
  constraint transcript_segments_transcript_segment_index_key unique (transcript_id, segment_index)
);

create index if not exists transcripts_fetched_at_idx
  on public.transcripts (fetched_at desc);

create index if not exists transcript_segments_video_id_idx
  on public.transcript_segments (video_id);

create index if not exists transcript_segments_transcript_id_idx
  on public.transcript_segments (transcript_id);

create index if not exists transcript_segments_segment_index_idx
  on public.transcript_segments (transcript_id, segment_index);

-- Full-text search index (safe default)
create index if not exists transcript_segments_text_fts_idx
  on public.transcript_segments
  using gin (to_tsvector('english', coalesce(text, '')));

-- Optional trigram index for fuzzy/ILIKE search when pg_trgm is available
do $$
begin
  execute 'create index if not exists transcript_segments_text_trgm_idx on public.transcript_segments using gin (text gin_trgm_ops)';
exception
  when undefined_object then
    raise notice 'pg_trgm operator class unavailable; skipping trigram index';
  when others then
    raise notice 'Could not create trigram index: %', sqlerrm;
end;
$$;

drop trigger if exists transcripts_set_updated_at on public.transcripts;
create trigger transcripts_set_updated_at
before update on public.transcripts
for each row
execute function public.set_updated_at_timestamp();

create or replace function public.search_transcript_index(
  search_query text,
  result_limit integer default 20
)
returns table (
  video_id text,
  video_url text,
  title text,
  channel_name text,
  segment_index integer,
  text text,
  start_seconds numeric,
  duration_seconds numeric,
  score numeric
)
language sql
stable
as $$
  with normalized as (
    select trim(search_query) as q
  ),
  fts_matches as (
    select
      ts.video_id,
      t.video_url,
      t.title,
      t.channel_name,
      ts.segment_index,
      ts.text,
      ts.start_seconds,
      ts.duration_seconds,
      ts_rank(
        to_tsvector('english', coalesce(ts.text, '')),
        websearch_to_tsquery('english', n.q)
      ) as score
    from public.transcript_segments ts
    inner join public.transcripts t on t.id = ts.transcript_id
    cross join normalized n
    where n.q <> ''
      and to_tsvector('english', coalesce(ts.text, '')) @@ websearch_to_tsquery('english', n.q)
  ),
  ilike_matches as (
    select
      ts.video_id,
      t.video_url,
      t.title,
      t.channel_name,
      ts.segment_index,
      ts.text,
      ts.start_seconds,
      ts.duration_seconds,
      0.5::numeric as score
    from public.transcript_segments ts
    inner join public.transcripts t on t.id = ts.transcript_id
    cross join normalized n
    where n.q <> ''
      and ts.text ilike ('%' || replace(replace(n.q, '%', '\%'), '_', '\_') || '%') escape '\'
      and not exists (select 1 from fts_matches)
  ),
  combined as (
    select * from fts_matches
    union all
    select * from ilike_matches
  )
  select *
  from combined
  order by score desc, video_id asc, segment_index asc
  limit greatest(coalesce(result_limit, 20), 1);
$$;

grant execute on function public.search_transcript_index(text, integer) to service_role;
