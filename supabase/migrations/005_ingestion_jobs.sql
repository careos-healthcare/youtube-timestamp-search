-- Optional durable ingestion job ledger (mirrors data/ingestion/queue.json)

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL UNIQUE,
  url text,
  category text,
  creator text,
  topic text,
  priority integer,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  source text,
  segment_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  next_retry_at timestamptz
);

CREATE INDEX IF NOT EXISTS ingestion_jobs_status_idx ON ingestion_jobs (status);
CREATE INDEX IF NOT EXISTS ingestion_jobs_next_retry_idx ON ingestion_jobs (next_retry_at);
