-- Add discovery metadata for category pages and seed pipeline

alter table public.transcripts
  add column if not exists category text,
  add column if not exists topic text,
  add column if not exists creator_name text;

create index if not exists transcripts_category_fetched_at_idx
  on public.transcripts (category, fetched_at desc);

create index if not exists transcripts_topic_idx
  on public.transcripts (topic);
