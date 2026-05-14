#!/usr/bin/env bash
# Extension API curl smoke examples (requires local dev server: npm run dev)
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
VIDEO_ID="${VIDEO_ID:-dQw4w9WgXcQ}"
QUERY="${QUERY:-never}"

echo "== index-status =="
curl -s "${BASE_URL}/api/extension/video/index-status?videoId=${VIDEO_ID}" | jq .

echo ""
echo "== search GET =="
curl -s "${BASE_URL}/api/extension/video/search?videoId=${VIDEO_ID}&query=${QUERY}" | jq .

echo ""
echo "== search POST =="
curl -s -X POST "${BASE_URL}/api/extension/video/search" \
  -H "Content-Type: application/json" \
  -d "{\"videoId\":\"${VIDEO_ID}\",\"query\":\"${QUERY}\"}" | jq .

echo ""
echo "== request-index =="
curl -s -X POST "${BASE_URL}/api/extension/video/request-index" \
  -H "Content-Type: application/json" \
  -d "{\"videoId\":\"${VIDEO_ID}\"}" | jq .
