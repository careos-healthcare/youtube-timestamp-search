-- Aggregated metrics for /admin/validation launch proof dashboard
CREATE OR REPLACE FUNCTION public.validation_dashboard_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'total_search_events', (
      SELECT COUNT(*)::int
      FROM search_analytics_events
      WHERE event_name IN (
        'search_query',
        'homepage_search',
        'search_submitted',
        'indexed_transcript_search'
      )
    ),
    'zero_result_searches', (
      SELECT COUNT(*)::int
      FROM search_analytics_events
      WHERE event_name IN ('search_zero_results', 'no_results')
    ),
    'youtube_timestamp_clicks', (
      SELECT COUNT(*)::int
      FROM search_analytics_events
      WHERE event_name IN (
        'youtube_timestamp_click',
        'youtube_open',
        'result_click',
        'search_result_click'
      )
    ),
    'feedback_yes', (
      SELECT COUNT(*)::int
      FROM search_analytics_events
      WHERE event_name = 'result_feedback'
        AND payload->>'helpful' = 'true'
    ),
    'feedback_no', (
      SELECT COUNT(*)::int
      FROM search_analytics_events
      WHERE event_name = 'result_feedback'
        AND payload->>'helpful' = 'false'
    ),
    'top_queries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('query', query, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT query, COUNT(*)::int AS cnt
        FROM search_analytics_events
        WHERE query IS NOT NULL AND btrim(query) <> ''
        GROUP BY query
        ORDER BY cnt DESC
        LIMIT 25
      ) ranked_queries
    ), '[]'::jsonb),
    'top_videos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('videoId', video_id, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT video_id, COUNT(*)::int AS cnt
        FROM search_analytics_events
        WHERE video_id IS NOT NULL
          AND event_name IN (
            'youtube_timestamp_click',
            'youtube_open',
            'result_click',
            'search_result_click'
          )
        GROUP BY video_id
        ORDER BY cnt DESC
        LIMIT 25
      ) ranked_videos
    ), '[]'::jsonb)
  );
$$;
