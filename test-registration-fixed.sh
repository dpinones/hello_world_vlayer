#!/bin/bash
set -e

echo "=== Testing Registration with New Contract ==="
echo ""

source .env

CONTRACT="0x13ae58cbe71e787c54642d7e012e0b6d38734b13"
RPC="https://sepolia.drpc.org"

echo "Contract: $CONTRACT"
echo "RPC: $RPC"
echo ""

# Check contract state
echo "Step 1: Checking contract state..."
STATE=$(cast call $CONTRACT "currentState()(uint8)" --rpc-url $RPC)
echo "Current state: $STATE (0 = Registration, 1 = WaitingForProofs, 2 = Claimable)"
echo ""

# Generate registration proof
echo "Step 2: Generating registration proof..."
curl -s -X POST http://localhost:3000/api/prove-register \
  -H "Content-Type: application/json" \
  -d '{"handle_tiktok":"@happy_hasbulla_"}' > /tmp/reg-presentation.json

if grep -q "error" /tmp/reg-presentation.json; then
  echo "Error generating proof:"
  cat /tmp/reg-presentation.json | python3 -m json.tool
  exit 1
fi

echo "✓ Proof generated"
echo ""

# Compress proof
echo "Step 3: Compressing proof..."
curl -s -X POST http://localhost:3000/api/compress-register \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/reg-presentation.json)}" \
  > /tmp/reg-compressed.json

if grep -q "error" /tmp/reg-compressed.json; then
  echo "Error compressing proof:"
  cat /tmp/reg-compressed.json | python3 -m json.tool
  exit 1
fi

echo "✓ Proof compressed"
echo ""

# Extract seal and journalData
echo "Step 4: Extracting proof data..."
SEAL=$(cat /tmp/reg-compressed.json | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('seal') or data.get('data', {}).get('zkProof') or data.get('data', {}).get('seal'))")
JOURNAL_ABI=$(cat /tmp/reg-compressed.json | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('public_outputs') or data.get('journalDataAbi') or data.get('data', {}).get('journalDataAbi'))")

if [ -z "$SEAL" ] || [ -z "$JOURNAL_ABI" ]; then
  echo "Error: Could not extract seal or journalDataAbi"
  cat /tmp/reg-compressed.json | python3 -m json.tool
  exit 1
fi

echo "Seal: ${SEAL:0:20}..."
echo "Journal ABI: ${JOURNAL_ABI:0:20}..."
echo ""

# Decode journal to verify
echo "Step 5: Decoding journal data to verify..."
node << 'EOFNODE'
const { decodeAbiParameters } = require('viem');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/reg-compressed.json', 'utf-8'));
const journalDataAbi = data.public_outputs || data.journalDataAbi || data.data?.journalDataAbi;

const decoded = decodeAbiParameters(
  [
    { type: 'bytes32', name: 'notaryKeyFingerprint' },
    { type: 'string', name: 'method' },
    { type: 'string', name: 'url' },
    { type: 'uint256', name: 'timestamp' },
    { type: 'bytes32', name: 'queriesHash' },
    { type: 'string', name: 'campaignId' },
    { type: 'string', name: 'handleTiktok' },
    { type: 'bool', name: 'proofSelf' },
  ],
  journalDataAbi
);

console.log('Decoded journal:');
console.log('  notaryKeyFingerprint:', decoded[0]);
console.log('  method:', decoded[1]);
console.log('  url:', decoded[2]);
console.log('  timestamp:', decoded[3]);
console.log('  queriesHash:', decoded[4]);
console.log('  campaignId:', decoded[5]);
console.log('  handleTiktok:', decoded[6]);
console.log('  proofSelf:', decoded[7]);
EOFNODE

echo ""

# Submit registration
echo "Step 6: Submitting registration to contract..."
TX_HASH=$(cast send $CONTRACT "register(bytes,bytes)" \
  "$JOURNAL_ABI" \
  "$SEAL" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC \
  --gas-limit 500000)

echo "✓ Registration transaction sent: $TX_HASH"
echo ""

# Verify registration
echo "Step 7: Verifying registration..."
IS_REGISTERED=$(cast call $CONTRACT "isRegistered(string)(bool)" "@happy_hasbulla_" --rpc-url $RPC)
echo "Is registered: $IS_REGISTERED"

if [ "$IS_REGISTERED" = "true" ]; then
  echo ""
  echo "✅ SUCCESS! Registration completed successfully"
else
  echo ""
  echo "❌ FAILED! User not registered in contract"
  exit 1
fi
