-- Optional persistence for search analytics (Phase 2)
CREATE TABLE IF NOT EXISTS search_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  query text,
  video_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_analytics_events_event_name_idx
  ON search_analytics_events (event_name);

CREATE INDEX IF NOT EXISTS search_analytics_events_query_idx
  ON search_analytics_events (query);

CREATE INDEX IF NOT EXISTS search_analytics_events_video_id_idx
  ON search_analytics_events (video_id);
