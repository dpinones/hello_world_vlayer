#!/bin/bash

echo "=== Extracting presentation from prove response ==="
PRESENTATION=$(cat /tmp/prove_response.json | jq -r '.data')

if [ -z "$PRESENTATION" ] || [ "$PRESENTATION" == "null" ]; then
  echo "Error: Could not extract presentation from prove response"
  exit 1
fi

echo "Presentation extracted (${#PRESENTATION} characters)"
echo ""

echo "=== Calling /api/compress ==="
curl -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d "{\"presentation\": \"$PRESENTATION\", \"handleTiktok\": \"@happy_hasbulla_\"}" \
  -s -o /tmp/compress_response.json

echo "Response received. Status: $?"
echo ""
echo "=== Compress Response ==="
cat /tmp/compress_response.json | jq '.'
echo ""

echo "=== Extracting QUERIES_HASH ==="
QUERIES_HASH=$(cat /tmp/compress_response.json | jq -r '.publicOutputs.queriesHash // empty')

if [ -n "$QUERIES_HASH" ]; then
  echo "✓ QUERIES_HASH found: $QUERIES_HASH"
  echo ""
  echo "Update your .env file with:"
  echo "QUERIES_HASH=$QUERIES_HASH"
else
  echo "✗ QUERIES_HASH not found in response"
fi
