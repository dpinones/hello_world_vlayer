#!/bin/bash
set -e

echo "=== Sepolia E2E Test Script ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load environment variables
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

source .env

# Check required env vars
if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${RED}Error: PRIVATE_KEY not set in .env${NC}"
  exit 1
fi

if [ -z "$SEPOLIA_RPC_URL" ]; then
  echo -e "${RED}Error: SEPOLIA_RPC_URL not set in .env${NC}"
  exit 1
fi

echo -e "${BLUE}Step 1: Building contracts...${NC}"
cd contracts
forge build
cd ..

echo ""
echo -e "${BLUE}Step 2: Deploying to Sepolia (with mock verifier)...${NC}"
cd contracts

# Export required environment variables for deployment
export QUERIES_HASH="$QUERIES_HASH"
export EXPECTED_URL="$EXPECTED_URL"
export NOTARY_KEY_FINGERPRINT="$NOTARY_KEY_FINGERPRINT"
export ZK_PROVER_GUEST_ID="$ZK_PROVER_GUEST_ID"

DEPLOYMENT_OUTPUT=$(npm run deploy sepolia 2>&1)
echo "$DEPLOYMENT_OUTPUT"

# Extract contract address from deployment output
CONTRACT_ADDRESS=$(echo "$DEPLOYMENT_OUTPUT" | grep -oE "Contract Address: 0x[a-fA-F0-9]{40}" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
  echo -e "${RED}Error: Could not extract contract address from deployment${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Contract deployed at: $CONTRACT_ADDRESS${NC}"

# Update .env file
cd ..
echo ""
echo -e "${BLUE}Step 3: Updating .env with new contract address...${NC}"

# Remove old NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS if exists
sed -i.bak '/^NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=/d' .env

# Add new contract address
echo "NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env

# Make sure chain ID is set to Sepolia
sed -i.bak '/^NEXT_PUBLIC_DEFAULT_CHAIN_ID=/d' .env
echo "NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111" >> .env

echo -e "${GREEN}✓ .env updated${NC}"

echo ""
echo -e "${BLUE}Step 4: Checking deployer balance on Sepolia...${NC}"
DEPLOYER_ADDRESS=$(cast wallet address $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $SEPOLIA_RPC_URL)
BALANCE_ETH=$(cast to-unit $BALANCE ether)
echo "Deployer: $DEPLOYER_ADDRESS"
echo "Balance: $BALANCE_ETH ETH"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Contract Address: $CONTRACT_ADDRESS"
echo "Network: Sepolia (Chain ID: 11155111)"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start the frontend:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. Open http://localhost:3000 in your browser"
echo ""
echo "3. Connect your wallet to Sepolia testnet"
echo ""
echo "4. Test the complete flow:"
echo "   - Enter your GitHub repo URL"
echo "   - Generate proof"
echo "   - Submit on-chain"
echo ""
echo -e "${BLUE}Block explorer:${NC}"
echo "https://sepolia.etherscan.io/address/$CONTRACT_ADDRESS"
