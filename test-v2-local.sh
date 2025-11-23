#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  V2 Local Test with Anvil${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Next.js is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${RED}Error: Next.js server not running on port 3000${NC}"
  echo "Please start the server first:"
  echo "  npm run dev"
  exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E 'PRIVATE_KEY|WETH_ADDRESS|ZK_PROVER_GUEST_ID|NOTARY_KEY_FINGERPRINT|REGISTRATION_QUERIES_HASH|SUBMISSION_QUERIES_HASH|REGISTRATION_URL|SUBMISSION_URL' | xargs)
fi

# Validate required env vars
REQUIRED_VARS=(
  "PRIVATE_KEY"
  "ZK_PROVER_GUEST_ID"
  "NOTARY_KEY_FINGERPRINT"
  "REGISTRATION_QUERIES_HASH"
  "SUBMISSION_QUERIES_HASH"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}Error: $var not set in .env${NC}"
    exit 1
  fi
done

RPC_URL="http://127.0.0.1:8545"

echo -e "${BLUE}Step 1: Checking Anvil connection...${NC}"
if ! cast chain-id --rpc-url $RPC_URL > /dev/null 2>&1; then
  echo -e "${RED}Error: Cannot connect to Anvil at $RPC_URL${NC}"
  echo "Please start Anvil first:"
  echo "  anvil"
  exit 1
fi

CHAIN_ID=$(cast chain-id --rpc-url $RPC_URL)
echo -e "${GREEN}✓ Connected to Anvil (Chain ID: $CHAIN_ID)${NC}"
echo ""

# Deploy WETH mock (if needed)
echo -e "${BLUE}Step 2: Deploying mock WETH...${NC}"

# Simple WETH contract bytecode (deposit, withdraw, transfer)
# For testing, we'll use a simple ERC20 mock
cat > /tmp/MockWETH.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockWETH {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) public {
        require(balanceOf[msg.sender] >= wad, "Insufficient balance");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    function transfer(address dst, uint256 wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(balanceOf[src] >= wad, "Insufficient balance");
        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "Insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }
        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(src, dst, wad);
        return true;
    }

    function approve(address guy, uint256 wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }
}
EOF

# Compile and deploy WETH
cd contracts
forge build --contracts /tmp/MockWETH.sol --force > /dev/null 2>&1

WETH_BYTECODE=$(forge inspect /tmp/MockWETH.sol:MockWETH bytecode)
WETH_ADDRESS=$(cast send --create $WETH_BYTECODE --private-key $PRIVATE_KEY --rpc-url $RPC_URL --json | python3 -c "import sys, json; print(json.load(sys.stdin)['contractAddress'])")

echo -e "${GREEN}✓ Mock WETH deployed: $WETH_ADDRESS${NC}"
echo ""

# Deploy V2 contract
echo -e "${BLUE}Step 3: Deploying V2 contract...${NC}"
echo "  This may take a moment..."

cd contracts
npm run deploy-v2:anvil -- $WETH_ADDRESS > /tmp/v2-deploy.log 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Deployment failed${NC}"
  cat /tmp/v2-deploy.log
  exit 1
fi

CONTRACT_ADDRESS=$(cat /tmp/v2-deploy.log | grep "Contract Address:" | awk '{print $3}')

if [ -z "$CONTRACT_ADDRESS" ]; then
  echo -e "${RED}✗ Could not extract contract address${NC}"
  cat /tmp/v2-deploy.log
  exit 1
fi

echo -e "${GREEN}✓ V2 Contract deployed: $CONTRACT_ADDRESS${NC}"
echo ""

# Deposit WETH into contract for rewards
echo -e "${BLUE}Step 4: Funding contract with WETH...${NC}"

DEPOSIT_AMOUNT="1000000000000000000" # 1 WETH

# Deposit ETH to get WETH
cast send $WETH_ADDRESS "deposit()" \
  --value 1ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL > /dev/null 2>&1

# Transfer WETH to contract
cast send $WETH_ADDRESS \
  "transfer(address,uint256)" \
  $CONTRACT_ADDRESS \
  $DEPOSIT_AMOUNT \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL > /dev/null 2>&1

WETH_BALANCE=$(cast call $WETH_ADDRESS "balanceOf(address)(uint256)" $CONTRACT_ADDRESS --rpc-url $RPC_URL)
WETH_BALANCE_ETHER=$(cast to-unit $WETH_BALANCE ether)

echo -e "${GREEN}✓ Contract funded with $WETH_BALANCE_ETHER WETH${NC}"
echo ""

# Run E2E test
echo -e "${BLUE}Step 5: Running E2E test...${NC}"
echo ""

cd ..
./test-v2-e2e.sh $CONTRACT_ADDRESS $RPC_URL

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Local Test Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Contract Addresses:"
echo "  WETH: $WETH_ADDRESS"
echo "  V2 Contract: $CONTRACT_ADDRESS"
echo ""
echo "You can interact with the contract:"
echo "  cast call $CONTRACT_ADDRESS \"currentState()(uint8)\" --rpc-url $RPC_URL"
echo "  cast call $CONTRACT_ADDRESS \"getCampaignStats()(uint256,uint256,uint256,uint8)\" --rpc-url $RPC_URL"
echo ""
