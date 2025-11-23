#!/bin/bash

echo "=== Creating compress request payload ==="

# Create the JSON payload with the full presentation object
cat > /tmp/compress_request.json <<EOF
{
  "presentation": $(cat /tmp/prove_response.json),
  "handleTiktok": "@happy_hasbulla_"
}
EOF

echo "Payload created"
echo ""

echo "=== Calling /api/compress ==="
curl -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d @/tmp/compress_request.json \
  -s -o /tmp/compress_response.json

echo "Response received. Status: $?"
echo ""

echo "=== Compress Response (first 500 chars) ==="
cat /tmp/compress_response.json | jq '.' | head -30
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
  echo "Checking for alternative paths..."
  cat /tmp/compress_response.json | jq 'keys'
fi
