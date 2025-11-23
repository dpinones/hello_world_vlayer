#!/bin/bash
set -e

CONTRACT="0x8ebac954cfa78e2f01a7a702a5605a3da573dbc9"
RPC="https://sepolia.drpc.org"
HANDLE="@happy_hasbulla_"

echo "=== Testing V2 Contract on Sepolia ==="
echo "Contract: $CONTRACT"
echo ""

# Load env
source .env

echo "Step 1: Check current state..."
STATE=$(cast call $CONTRACT "currentState()(uint8)" --rpc-url $RPC)
echo "Current state: $STATE"
echo ""

echo "Step 2: Generating registration proof..."
curl -s -X POST http://localhost:3000/api/prove-register \
  -H "Content-Type: application/json" \
  -d "{}" > /tmp/reg-pres.json

echo "Step 3: Compressing registration proof..."
curl -s -X POST http://localhost:3000/api/compress-register \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/reg-pres.json)}" \
  > /tmp/reg-comp.json

# Extract data
JOURNAL=$(cat /tmp/reg-comp.json | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('public_outputs') or d.get('journalDataAbi') or d['data']['journalDataAbi'])")
PROOF=$(cat /tmp/reg-comp.json | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('zkProof') or d.get('proof') or d['data']['zkProof'])")

echo "Journal: ${JOURNAL:0:66}..."
echo "Proof: ${PROOF:0:66}..."
echo ""

echo "Step 4: Submitting registration to Sepolia..."
TX=$(cast send $CONTRACT \
  "register(bytes,bytes)" \
  $JOURNAL \
  $PROOF \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC \
  --json | python3 -c "import sys, json; print(json.load(sys.stdin)['transactionHash'])")

echo "✓ Registration TX: $TX"
echo "✓ View on Sepolia: https://sepolia.etherscan.io/tx/$TX"
echo ""

echo "Step 5: Verify registration..."
IS_REG=$(cast call $CONTRACT "isRegistered(string)(bool)" "$HANDLE" --rpc-url $RPC)
echo "Is registered: $IS_REG"
echo ""

if [ "$STATE" = "0" ]; then
  echo "Step 6: Advancing to WaitingForProofs..."
  ADV_TX=$(cast send $CONTRACT \
    "advanceState()" \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC \
    --json | python3 -c "import sys, json; print(json.load(sys.stdin)['transactionHash'])")

  echo "✓ Advance TX: $ADV_TX"
  echo "✓ View on Sepolia: https://sepolia.etherscan.io/tx/$ADV_TX"
fi

echo ""
echo "=== Registration Complete! ==="
echo ""
echo "Next steps:"
echo "1. Advance to WaitingForProofs (if not done)"
echo "2. Generate submission proof"
echo "3. Submit campaign proof"
echo "4. Advance to Claimable"
echo "5. Claim rewards"
