#!/bin/bash

echo "=== Calling /api/prove ==="
curl -X POST http://localhost:3000/api/prove \
  -H "Content-Type: application/json" \
  -d "{}" \
  -s -o /tmp/prove_response.json

echo "Response received. Status: $?"
echo ""
echo "=== Response Content ==="
cat /tmp/prove_response.json | jq '.'
