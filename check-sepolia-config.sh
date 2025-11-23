#!/bin/bash

echo "=== Checking Sepolia Configuration ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Load .env
if [ ! -f .env ]; then
  echo -e "${RED}✗ .env file not found${NC}"
  exit 1
fi

source .env

echo "1. Checking environment variables..."

# Check PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ]; then
  echo -e "   ${RED}✗ PRIVATE_KEY not set${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "   ${GREEN}✓ PRIVATE_KEY set${NC}"
  DEPLOYER=$(cast wallet address $PRIVATE_KEY 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "     Deployer address: $DEPLOYER"
  fi
fi

# Check SEPOLIA_RPC_URL
if [ -z "$SEPOLIA_RPC_URL" ]; then
  echo -e "   ${RED}✗ SEPOLIA_RPC_URL not set${NC}"
  echo "     Get one from https://dashboard.alchemy.com/ or https://infura.io/"
  ERRORS=$((ERRORS + 1))
elif [[ "$SEPOLIA_RPC_URL" == *"YOUR_"* ]]; then
  echo -e "   ${YELLOW}⚠ SEPOLIA_RPC_URL contains placeholder${NC}"
  echo "     Please replace with real API key"
  ERRORS=$((ERRORS + 1))
else
  echo -e "   ${GREEN}✓ SEPOLIA_RPC_URL set${NC}"
fi

# Check ZK_PROVER_GUEST_ID
if [ -z "$ZK_PROVER_GUEST_ID" ]; then
  echo -e "   ${RED}✗ ZK_PROVER_GUEST_ID not set${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "   ${GREEN}✓ ZK_PROVER_GUEST_ID set${NC}"
  echo "     Guest ID: $ZK_PROVER_GUEST_ID"
fi

# Check Web Prover API
if [ -z "$WEB_PROVER_API_CLIENT_ID" ]; then
  echo -e "   ${YELLOW}⚠ WEB_PROVER_API_CLIENT_ID not set${NC}"
else
  echo -e "   ${GREEN}✓ WEB_PROVER_API_CLIENT_ID set${NC}"
fi

if [ -z "$WEB_PROVER_API_SECRET" ]; then
  echo -e "   ${YELLOW}⚠ WEB_PROVER_API_SECRET not set${NC}"
else
  echo -e "   ${GREEN}✓ WEB_PROVER_API_SECRET set${NC}"
fi

echo ""
echo "2. Checking Sepolia RPC connection..."

if [ -n "$SEPOLIA_RPC_URL" ] && [[ "$SEPOLIA_RPC_URL" != *"YOUR_"* ]]; then
  CHAIN_ID=$(cast chain-id --rpc-url $SEPOLIA_RPC_URL 2>/dev/null)
  if [ $? -eq 0 ]; then
    if [ "$CHAIN_ID" == "11155111" ]; then
      echo -e "   ${GREEN}✓ Connected to Sepolia (Chain ID: $CHAIN_ID)${NC}"
    else
      echo -e "   ${RED}✗ Wrong chain! Expected 11155111, got $CHAIN_ID${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo -e "   ${RED}✗ Cannot connect to RPC${NC}"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""
echo "3. Checking deployer balance..."

if [ -n "$PRIVATE_KEY" ] && [ -n "$SEPOLIA_RPC_URL" ] && [[ "$SEPOLIA_RPC_URL" != *"YOUR_"* ]]; then
  DEPLOYER=$(cast wallet address $PRIVATE_KEY 2>/dev/null)
  if [ $? -eq 0 ]; then
    BALANCE=$(cast balance $DEPLOYER --rpc-url $SEPOLIA_RPC_URL 2>/dev/null)
    if [ $? -eq 0 ]; then
      BALANCE_ETH=$(cast to-unit $BALANCE ether 2>/dev/null)
      if [ $? -eq 0 ]; then
        echo "   Address: $DEPLOYER"
        echo "   Balance: $BALANCE_ETH ETH"

        # Check if balance is sufficient (need at least 0.05 ETH)
        if (( $(echo "$BALANCE_ETH < 0.05" | bc -l) )); then
          echo -e "   ${YELLOW}⚠ Low balance! Need at least 0.05 ETH for deployment${NC}"
          echo "   Get testnet ETH from:"
          echo "   - https://sepoliafaucet.com/"
          echo "   - https://www.infura.io/faucet/sepolia"
        else
          echo -e "   ${GREEN}✓ Sufficient balance for deployment${NC}"
        fi
      fi
    fi
  fi
fi

echo ""
echo "4. Checking contract compilation..."

if [ -f "contracts/out/GitHubContributionVerifier.sol/GitHubContributionVerifier.json" ]; then
  echo -e "   ${GREEN}✓ Contract already compiled${NC}"
else
  echo -e "   ${YELLOW}⚠ Contract not compiled yet${NC}"
  echo "     Run: cd contracts && forge build"
fi

echo ""
echo "=================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run: ./run-sepolia-test.sh"
  echo "2. Or manually: cd contracts && npm run deploy sepolia"
else
  echo -e "${RED}✗ Found $ERRORS error(s). Please fix them before deploying.${NC}"
  exit 1
fi
