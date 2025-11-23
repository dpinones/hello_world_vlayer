#!/bin/bash
set -e

echo "=== Testing TikTok Campaign Verifier on Sepolia ==="
echo ""

# Load environment variables
source .env

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

CONTRACT_ADDRESS="${NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS}"
RPC_URL="${SEPOLIA_RPC_URL}"
PRIVATE_KEY="${PRIVATE_KEY}"

if [ -z "$CONTRACT_ADDRESS" ]; then
  echo -e "${RED}Error: NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS not set${NC}"
  exit 1
fi

if [ -z "$RPC_URL" ]; then
  echo -e "${RED}Error: SEPOLIA_RPC_URL not set${NC}"
  exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${RED}Error: PRIVATE_KEY not set${NC}"
  exit 1
fi

echo -e "${BLUE}Contract Address:${NC} $CONTRACT_ADDRESS"
echo -e "${BLUE}RPC URL:${NC} $RPC_URL"
echo ""

# Get deployer address
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
echo -e "${BLUE}Deployer:${NC} $DEPLOYER"

# Check balance
BALANCE_WEI=$(cast balance $DEPLOYER --rpc-url $RPC_URL)
BALANCE=$(echo "scale=6; $BALANCE_WEI / 1000000000000000000" | bc)
echo -e "${BLUE}Balance:${NC} $BALANCE ETH"
echo ""

# Verify contract parameters
echo -e "${BLUE}Verifying contract parameters...${NC}"
QUERIES_HASH_ON_CHAIN=$(cast call $CONTRACT_ADDRESS "EXPECTED_QUERIES_HASH()(bytes32)" --rpc-url $RPC_URL)
EXPECTED_URL_ON_CHAIN=$(cast call $CONTRACT_ADDRESS "expectedUrlPattern()(string)" --rpc-url $RPC_URL)
CAMPAIGN_ID_ON_CHAIN=$(cast call $CONTRACT_ADDRESS "CAMPAIGN_ID()(string)" --rpc-url $RPC_URL)

echo "  QUERIES_HASH: $QUERIES_HASH_ON_CHAIN"
echo "  Expected URL: $EXPECTED_URL_ON_CHAIN"
echo "  Campaign ID: $CAMPAIGN_ID_ON_CHAIN"
echo ""

# Check if proof.json exists
if [ ! -f "contracts/proof.json" ]; then
  echo -e "${RED}Error: contracts/proof.json not found${NC}"
  echo "Please generate a proof first using the frontend or API"
  exit 1
fi

echo -e "${BLUE}Loading proof from contracts/proof.json...${NC}"

# Extract zkProof and journalDataAbi from proof.json
ZK_PROOF=$(node -e "const data = require('./contracts/proof.json'); console.log(data.zkProof || data.data?.zkProof || '')")
JOURNAL_DATA=$(node -e "const data = require('./contracts/proof.json'); console.log(data.journalDataAbi || data.data?.journalDataAbi || '')")

if [ -z "$ZK_PROOF" ] || [ "$ZK_PROOF" == "null" ]; then
  echo -e "${RED}Error: zkProof not found in proof.json${NC}"
  exit 1
fi

if [ -z "$JOURNAL_DATA" ] || [ "$JOURNAL_DATA" == "null" ]; then
  echo -e "${RED}Error: journalDataAbi not found in proof.json${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Proof loaded successfully${NC}"
echo "  zkProof length: ${#ZK_PROOF}"
echo "  journalData length: ${#JOURNAL_DATA}"
echo ""

# Decode journal data to see what we're submitting
echo -e "${BLUE}Decoding journal data...${NC}"
node -e "
const { decodeAbiParameters } = require('viem');
const journalDataAbi = '$JOURNAL_DATA';

try {
  const decoded = decodeAbiParameters(
    [
      { type: 'bytes32', name: 'notaryKeyFingerprint' },
      { type: 'string', name: 'method' },
      { type: 'string', name: 'url' },
      { type: 'uint256', name: 'timestamp' },
      { type: 'bytes32', name: 'queriesHash' },
      { type: 'string', name: 'campaignId' },
      { type: 'string', name: 'handleTiktok' },
      { type: 'uint256', name: 'scoreCalidad' },
      { type: 'string', name: 'urlVideo' },
    ],
    journalDataAbi
  );

  console.log('  Campaign ID:', decoded[5]);
  console.log('  Handle TikTok:', decoded[6]);
  console.log('  Score Calidad:', decoded[7].toString());
  console.log('  URL Video:', decoded[8]);
} catch (e) {
  console.error('Error decoding:', e.message);
  process.exit(1);
}
"
echo ""

# Submit to contract
echo -e "${BLUE}Submitting campaign to contract...${NC}"

# Encode function call
CALLDATA=$(cast calldata "submitCampaign(bytes,bytes)" "$JOURNAL_DATA" "$ZK_PROOF")

echo "Sending transaction..."
TX_HASH=$(cast send $CONTRACT_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  "$CALLDATA")

echo -e "${GREEN}✓ Transaction sent!${NC}"
echo "  TX Hash: $TX_HASH"
echo ""

# Wait for confirmation
echo -e "${BLUE}Waiting for confirmation...${NC}"
RECEIPT=$(cast receipt $TX_HASH --rpc-url $RPC_URL)

# Check if transaction succeeded
STATUS=$(echo "$RECEIPT" | grep "status" | awk '{print $2}')

if [ "$STATUS" == "1" ]; then
  echo -e "${GREEN}✓ Transaction confirmed successfully!${NC}"

  # Extract gas used
  GAS_USED=$(echo "$RECEIPT" | grep "gasUsed" | awk '{print $2}')
  echo "  Gas used: $GAS_USED"

  # Get the TikTok handle from the proof to query the score
  HANDLE=$(node -e "
    const { decodeAbiParameters } = require('viem');
    const decoded = decodeAbiParameters(
      [
        { type: 'bytes32', name: 'notaryKeyFingerprint' },
        { type: 'string', name: 'method' },
        { type: 'string', name: 'url' },
        { type: 'uint256', name: 'timestamp' },
        { type: 'bytes32', name: 'queriesHash' },
        { type: 'string', name: 'campaignId' },
        { type: 'string', name: 'handleTiktok' },
        { type: 'uint256', name: 'scoreCalidad' },
        { type: 'string', name: 'urlVideo' },
      ],
      '$JOURNAL_DATA'
    );
    console.log(decoded[6]);
  ")

  echo ""
  echo -e "${BLUE}Querying score from contract...${NC}"
  SCORE=$(cast call $CONTRACT_ADDRESS "scoresByHandle(string)(uint256)" "$HANDLE" --rpc-url $RPC_URL)
  echo "  Handle: $HANDLE"
  echo "  Score stored: $SCORE"

else
  echo -e "${RED}✗ Transaction failed!${NC}"
  echo "$RECEIPT"
  exit 1
fi

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
echo ""
echo "View transaction on Etherscan:"
echo "https://sepolia.etherscan.io/tx/$TX_HASH"
echo ""
echo "View contract on Etherscan:"
echo "https://sepolia.etherscan.io/address/$CONTRACT_ADDRESS"
