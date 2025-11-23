#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TikTok Campaign Verifier V2 E2E Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
HANDLE="@happy_hasbulla_"
CAMPAIGN_ID="campaign_ethglobal_2024"

# Check if contract address is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Contract address required${NC}"
  echo "Usage: ./test-v2-e2e.sh <CONTRACT_ADDRESS> [RPC_URL]"
  echo ""
  echo "Example:"
  echo "  ./test-v2-e2e.sh 0x1234... http://127.0.0.1:8545"
  exit 1
fi

CONTRACT_ADDRESS=$1
RPC_URL=${2:-"http://127.0.0.1:8545"}

echo -e "${BLUE}Configuration:${NC}"
echo "  Contract Address: ${CONTRACT_ADDRESS}"
echo "  RPC URL: ${RPC_URL}"
echo "  Handle: ${HANDLE}"
echo ""

# Load private key from .env
if [ -f .env ]; then
  export $(grep PRIVATE_KEY .env | xargs)
fi

if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${RED}Error: PRIVATE_KEY not found in .env${NC}"
  exit 1
fi

# Helper function to check state
check_state() {
  local expected=$1
  local state=$(cast call $CONTRACT_ADDRESS "currentState()(uint8)" --rpc-url $RPC_URL)
  state=$((state))

  if [ "$state" -eq "$expected" ]; then
    echo -e "${GREEN}✓ State is correct: $state${NC}"
    return 0
  else
    echo -e "${RED}✗ State mismatch. Expected: $expected, Got: $state${NC}"
    return 1
  fi
}

# Step 1: Verify initial state (Registration)
echo -e "${BLUE}Step 1: Verifying initial state...${NC}"
check_state 0
echo ""

# Step 2: Check if already registered
echo -e "${BLUE}Step 2: Checking if handle is already registered...${NC}"
ALREADY_REGISTERED=$(cast call $CONTRACT_ADDRESS "isRegistered(string)(bool)" "$HANDLE" --rpc-url $RPC_URL)

if [ "$ALREADY_REGISTERED" = "true" ]; then
  echo -e "${YELLOW}⚠ Handle already registered, skipping registration step${NC}"
else
  echo -e "${GREEN}✓ Handle not registered yet${NC}"

  # Step 3: Generate registration proof
  echo ""
  echo -e "${BLUE}Step 3: Generating registration proof...${NC}"
  echo "  Calling /api/prove-register (this may take 30-60 seconds)..."

  curl -s -X POST http://localhost:3000/api/prove-register \
    -H "Content-Type: application/json" \
    -d "{}" > /tmp/v2-reg-presentation.json

  if grep -q "error" /tmp/v2-reg-presentation.json; then
    echo -e "${RED}✗ Error generating registration proof:${NC}"
    cat /tmp/v2-reg-presentation.json | python3 -m json.tool
    exit 1
  fi

  echo -e "${GREEN}✓ Registration proof generated${NC}"

  # Step 4: Compress registration proof
  echo ""
  echo -e "${BLUE}Step 4: Compressing registration proof...${NC}"
  echo "  Calling /api/compress-register (this may take 60-90 seconds)..."

  curl -s -X POST http://localhost:3000/api/compress-register \
    -H "Content-Type: application/json" \
    -d "{\"presentation\":$(cat /tmp/v2-reg-presentation.json)}" \
    > /tmp/v2-reg-compressed.json

  if grep -q "error" /tmp/v2-reg-compressed.json; then
    echo -e "${RED}✗ Error compressing registration proof:${NC}"
    cat /tmp/v2-reg-compressed.json | python3 -m json.tool
    exit 1
  fi

  echo -e "${GREEN}✓ Registration proof compressed${NC}"

  # Step 5: Extract proof data
  echo ""
  echo -e "${BLUE}Step 5: Extracting proof data...${NC}"

  JOURNAL_DATA=$(cat /tmp/v2-reg-compressed.json | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('public_outputs') or data.get('journalDataAbi') or data['data']['journalDataAbi'])")
  ZK_PROOF=$(cat /tmp/v2-reg-compressed.json | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('zkProof') or data.get('proof') or data['data']['zkProof'])")

  echo "  Journal Data: ${JOURNAL_DATA:0:66}..."
  echo "  ZK Proof: ${ZK_PROOF:0:66}..."

  # Step 6: Submit registration on-chain
  echo ""
  echo -e "${BLUE}Step 6: Submitting registration to blockchain...${NC}"

  REG_TX=$(cast send $CONTRACT_ADDRESS \
    "register(bytes,bytes)" \
    $JOURNAL_DATA \
    $ZK_PROOF \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --json | python3 -c "import sys, json; print(json.load(sys.stdin)['transactionHash'])")

  echo -e "${GREEN}✓ Registration transaction sent: $REG_TX${NC}"

  # Verify registration
  REGISTERED=$(cast call $CONTRACT_ADDRESS "isRegistered(string)(bool)" "$HANDLE" --rpc-url $RPC_URL)
  if [ "$REGISTERED" = "true" ]; then
    echo -e "${GREEN}✓ Handle successfully registered!${NC}"
  else
    echo -e "${RED}✗ Registration failed${NC}"
    exit 1
  fi
fi

# Step 7: Get campaign stats
echo ""
echo -e "${BLUE}Step 7: Getting campaign stats...${NC}"
STATS=$(cast call $CONTRACT_ADDRESS "getCampaignStats()(uint256,uint256,uint256,uint8)" --rpc-url $RPC_URL)
echo "  Stats: $STATS"

# Step 8: Advance to WaitingForProofs
echo ""
echo -e "${BLUE}Step 8: Advancing to WaitingForProofs state...${NC}"

CURRENT_STATE=$(cast call $CONTRACT_ADDRESS "currentState()(uint8)" --rpc-url $RPC_URL)
CURRENT_STATE=$((CURRENT_STATE))

if [ "$CURRENT_STATE" -eq 0 ]; then
  echo "  Calling advanceState()..."
  ADVANCE_TX=$(cast send $CONTRACT_ADDRESS \
    "advanceState()" \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --json | python3 -c "import sys, json; print(json.load(sys.stdin)['transactionHash'])")

  echo -e "${GREEN}✓ State advanced: $ADVANCE_TX${NC}"
  check_state 1
elif [ "$CURRENT_STATE" -eq 1 ]; then
  echo -e "${YELLOW}⚠ Already in WaitingForProofs state${NC}"
else
  echo -e "${YELLOW}⚠ Campaign in state $CURRENT_STATE, skipping advance${NC}"
fi

# Step 9: Generate submission proof
echo ""
echo -e "${BLUE}Step 9: Generating submission proof...${NC}"
echo "  Calling /api/prove (this may take 30-60 seconds)..."

curl -s -X POST http://localhost:3000/api/prove \
  -H "Content-Type: application/json" \
  -d "{}" > /tmp/v2-sub-presentation.json

if grep -q "error" /tmp/v2-sub-presentation.json; then
  echo -e "${RED}✗ Error generating submission proof:${NC}"
  cat /tmp/v2-sub-presentation.json | python3 -m json.tool
  exit 1
fi

echo -e "${GREEN}✓ Submission proof generated${NC}"

# Step 10: Compress submission proof
echo ""
echo -e "${BLUE}Step 10: Compressing submission proof...${NC}"
echo "  Calling /api/compress (this may take 60-90 seconds)..."

curl -s -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/v2-sub-presentation.json),\"handleTiktok\":\"$HANDLE\"}" \
  > /tmp/v2-sub-compressed.json

if grep -q "error" /tmp/v2-sub-compressed.json; then
  echo -e "${RED}✗ Error compressing submission proof:${NC}"
  cat /tmp/v2-sub-compressed.json | python3 -m json.tool
  exit 1
fi

echo -e "${GREEN}✓ Submission proof compressed${NC}"

# Step 11: Extract submission proof data
echo ""
echo -e "${BLUE}Step 11: Extracting submission proof data...${NC}"

SUB_JOURNAL_DATA=$(cat /tmp/v2-sub-compressed.json | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('public_outputs') or data.get('journalDataAbi') or data['data']['journalDataAbi'])")
SUB_ZK_PROOF=$(cat /tmp/v2-sub-compressed.json | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('zkProof') or data.get('proof') or data['data']['zkProof'])")

echo "  Journal Data: ${SUB_JOURNAL_DATA:0:66}..."
echo "  ZK Proof: ${SUB_ZK_PROOF:0:66}..."

# Step 12: Submit campaign proof on-chain
echo ""
echo -e "${BLUE}Step 12: Submitting campaign proof to blockchain...${NC}"

SUB_TX=$(cast send $CONTRACT_ADDRESS \
  "submitCampaign(bytes,bytes)" \
  $SUB_JOURNAL_DATA \
  $SUB_ZK_PROOF \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --json | python3 -c "import sys, json; print(json.load(sys.stdin)['transactionHash'])")

echo -e "${GREEN}✓ Submission transaction sent: $SUB_TX${NC}"

# Step 13: Get score
echo ""
echo -e "${BLUE}Step 13: Getting score for handle...${NC}"

SCORE=$(cast call $CONTRACT_ADDRESS "scoresByHandle(string)(uint256)" "$HANDLE" --rpc-url $RPC_URL)
echo -e "${GREEN}✓ Score: $SCORE${NC}"

# Step 14: Advance to Claimable
echo ""
echo -e "${BLUE}Step 14: Advancing to Claimable state...${NC}"

CURRENT_STATE=$(cast call $CONTRACT_ADDRESS "currentState()(uint8)" --rpc-url $RPC_URL)
CURRENT_STATE=$((CURRENT_STATE))

if [ "$CURRENT_STATE" -eq 1 ]; then
  echo "  Calling advanceState()..."
  ADVANCE2_TX=$(cast send $CONTRACT_ADDRESS \
    "advanceState()" \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --json | python3 -c "import sys, json; print(json.load(sys.stdin)['transactionHash'])")

  echo -e "${GREEN}✓ State advanced: $ADVANCE2_TX${NC}"
  check_state 2
elif [ "$CURRENT_STATE" -eq 2 ]; then
  echo -e "${YELLOW}⚠ Already in Claimable state${NC}"
else
  echo -e "${YELLOW}⚠ Campaign in state $CURRENT_STATE, cannot advance to Claimable${NC}"
fi

# Step 15: Check WETH balance in contract
echo ""
echo -e "${BLUE}Step 15: Checking WETH balance in contract...${NC}"

if [ -f .env ]; then
  export $(grep WETH_ADDRESS .env | xargs)
fi

if [ -z "$WETH_ADDRESS" ]; then
  echo -e "${YELLOW}⚠ WETH_ADDRESS not found in .env, skipping reward claim test${NC}"
else
  WETH_BALANCE=$(cast call $WETH_ADDRESS "balanceOf(address)(uint256)" $CONTRACT_ADDRESS --rpc-url $RPC_URL)
  WETH_BALANCE_ETHER=$(cast to-unit $WETH_BALANCE ether)

  echo "  WETH Balance: $WETH_BALANCE ($WETH_BALANCE_ETHER WETH)"

  if [ "$WETH_BALANCE" = "0" ]; then
    echo -e "${YELLOW}⚠ Contract has no WETH. Skipping claim test.${NC}"
    echo -e "${YELLOW}  To test claims, deposit WETH to contract:${NC}"
    echo "  cast send $WETH_ADDRESS \"deposit()\" --value 0.1ether --private-key \$PRIVATE_KEY --rpc-url $RPC_URL"
    echo "  cast send $WETH_ADDRESS \"transfer(address,uint256)\" $CONTRACT_ADDRESS 100000000000000000 --private-key \$PRIVATE_KEY --rpc-url $RPC_URL"
  else
    # Step 16: Calculate claimable reward
    echo ""
    echo -e "${BLUE}Step 16: Calculating claimable reward...${NC}"

    REWARD=$(cast call $CONTRACT_ADDRESS "getRewardAmount(string)(uint256)" "$HANDLE" --rpc-url $RPC_URL)
    REWARD_ETHER=$(cast to-unit $REWARD ether)

    echo -e "${GREEN}✓ Claimable Reward: $REWARD ($REWARD_ETHER WETH)${NC}"

    # Step 17: Check if already claimed
    echo ""
    echo -e "${BLUE}Step 17: Checking claim status...${NC}"

    CLAIMED=$(cast call $CONTRACT_ADDRESS "hasClaimed(string)(bool)" "$HANDLE" --rpc-url $RPC_URL)

    if [ "$CLAIMED" = "true" ]; then
      echo -e "${YELLOW}⚠ Reward already claimed${NC}"
    else
      echo -e "${GREEN}✓ Reward not claimed yet${NC}"

      # Step 18: Claim reward
      echo ""
      echo -e "${BLUE}Step 18: Claiming reward...${NC}"

      CLAIM_TX=$(cast send $CONTRACT_ADDRESS \
        "claimReward(string)" \
        "$HANDLE" \
        --private-key $PRIVATE_KEY \
        --rpc-url $RPC_URL \
        --json | python3 -c "import sys, json; print(json.load(sys.stdin)['transactionHash'])")

      echo -e "${GREEN}✓ Claim transaction sent: $CLAIM_TX${NC}"

      # Verify claim
      CLAIMED_NOW=$(cast call $CONTRACT_ADDRESS "hasClaimed(string)(bool)" "$HANDLE" --rpc-url $RPC_URL)
      if [ "$CLAIMED_NOW" = "true" ]; then
        echo -e "${GREEN}✓ Reward successfully claimed!${NC}"
      else
        echo -e "${RED}✗ Claim verification failed${NC}"
      fi
    fi
  fi
fi

# Final stats
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Final Campaign Stats${NC}"
echo -e "${BLUE}========================================${NC}"

FINAL_STATS=$(cast call $CONTRACT_ADDRESS "getCampaignStats()(uint256,uint256,uint256,uint8)" --rpc-url $RPC_URL)
TOTAL_REGISTERED=$(cast call $CONTRACT_ADDRESS "totalRegistered()(uint256)" --rpc-url $RPC_URL)
TOTAL_SUBMITTED=$(cast call $CONTRACT_ADDRESS "totalSubmitted()(uint256)" --rpc-url $RPC_URL)
TOTAL_SCORE=$(cast call $CONTRACT_ADDRESS "totalScore()(uint256)" --rpc-url $RPC_URL)
FINAL_STATE=$(cast call $CONTRACT_ADDRESS "currentState()(uint8)" --rpc-url $RPC_URL)

echo ""
echo "  Total Registered: $TOTAL_REGISTERED"
echo "  Total Submitted: $TOTAL_SUBMITTED"
echo "  Total Score: $TOTAL_SCORE"
echo "  Current State: $FINAL_STATE"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ E2E Test Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Test Summary:"
echo "  ✓ Registration phase completed"
echo "  ✓ Submission phase completed"
echo "  ✓ State transitions working"
if [ "$WETH_BALANCE" != "0" ] && [ "$CLAIMED_NOW" = "true" ]; then
  echo "  ✓ Reward claim completed"
fi
echo ""
