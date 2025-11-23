#!/bin/bash
set -e

source .env

CONTRACT="0xb00ab1045d947462b1227c8e13530b835edb4250"
RPC="https://sepolia.drpc.org"

echo "=== Testing Registration on Sepolia ==="
echo "Contract: $CONTRACT"
echo ""

# Check compressed proof exists
if [ ! -f /tmp/reg-compressed.json ]; then
  echo "Error: /tmp/reg-compressed.json not found"
  echo "Please run the proof generation first"
  exit 1
fi

# Extract proof data
ZK_PROOF=$(cat /tmp/reg-compressed.json | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).data.zkProof)")
JOURNAL=$(cat /tmp/reg-compressed.json | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).data.journalDataAbi)")

echo "ZK Proof: ${ZK_PROOF:0:66}..."
echo "Journal: ${JOURNAL:0:66}..."
echo ""

# Call register
echo "Calling register() on contract..."
cast send $CONTRACT \
  "register(bytes,bytes)" \
  "$ZK_PROOF" \
  "$JOURNAL" \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo ""
echo "✓ Registration successful!"
