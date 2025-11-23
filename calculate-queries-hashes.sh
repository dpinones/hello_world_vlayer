#!/bin/bash
set -e

echo "=== Calculating QUERIES_HASH for both Registration and Submission ==="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Generating REGISTRATION proof...${NC}"
echo "This may take 30-60 seconds..."

curl -s -X POST http://localhost:3000/api/prove-register \
  -H "Content-Type: application/json" \
  -d '{"handle_tiktok":"@happy_hasbulla_"}' > /tmp/registration-presentation.json

# Check if proof was generated
if grep -q "error" /tmp/registration-presentation.json; then
  echo -e "${RED}✗ Error generating registration proof:${NC}"
  cat /tmp/registration-presentation.json | python3 -m json.tool
  exit 1
fi

echo -e "${GREEN}✓ Registration proof generated${NC}"
echo ""

echo -e "${BLUE}Step 2: Compressing REGISTRATION proof...${NC}"

curl -s -X POST http://localhost:3000/api/compress-register \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/registration-presentation.json)}" \
  > /tmp/registration-compressed.json

# Check if compression was successful
if grep -q "error" /tmp/registration-compressed.json; then
  echo -e "${RED}✗ Error compressing registration proof:${NC}"
  cat /tmp/registration-compressed.json | python3 -m json.tool
  exit 1
fi

echo -e "${GREEN}✓ Registration proof compressed${NC}"
echo ""

echo -e "${BLUE}Step 3: Extracting REGISTRATION_QUERIES_HASH...${NC}"

REGISTRATION_HASH=$(node << 'EOFNODE'
const { decodeAbiParameters } = require('viem');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/registration-compressed.json', 'utf-8'));
const journalDataAbi = data.public_outputs || data.journalDataAbi || data.data?.journalDataAbi;

if (!journalDataAbi) {
  console.error('Could not find journalDataAbi in response');
  process.exit(1);
}

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

console.log(decoded[4]);
EOFNODE
)

echo -e "${GREEN}✓ REGISTRATION_QUERIES_HASH extracted${NC}"
echo ""
echo -e "${YELLOW}REGISTRATION_QUERIES_HASH=${REGISTRATION_HASH}${NC}"
echo ""

echo -e "${BLUE}Step 4: Generating SUBMISSION proof...${NC}"
echo "This may take 30-60 seconds..."

curl -s -X POST http://localhost:3000/api/prove \
  -H "Content-Type: application/json" \
  -d '{"handle_tiktok":"@happy_hasbulla_","url_video":"https://www.tiktok.com/@happy_hasbulla_/video/123"}' > /tmp/submission-presentation.json

if grep -q "error" /tmp/submission-presentation.json; then
  echo -e "${RED}✗ Error generating submission proof:${NC}"
  cat /tmp/submission-presentation.json | python3 -m json.tool
  exit 1
fi

echo -e "${GREEN}✓ Submission proof generated${NC}"
echo ""

echo -e "${BLUE}Step 5: Compressing SUBMISSION proof...${NC}"

curl -s -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/submission-presentation.json),\"handleTiktok\":\"@happy_hasbulla_\"}" \
  > /tmp/submission-compressed.json

if grep -q "error" /tmp/submission-compressed.json; then
  echo -e "${RED}✗ Error compressing submission proof:${NC}"
  cat /tmp/submission-compressed.json | python3 -m json.tool
  exit 1
fi

echo -e "${GREEN}✓ Submission proof compressed${NC}"
echo ""

echo -e "${BLUE}Step 6: Extracting SUBMISSION_QUERIES_HASH...${NC}"

SUBMISSION_HASH=$(node << 'EOFNODE'
const { decodeAbiParameters } = require('viem');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/submission-compressed.json', 'utf-8'));
const journalDataAbi = data.public_outputs || data.journalDataAbi || data.data?.journalDataAbi;

if (!journalDataAbi) {
  console.error('Could not find journalDataAbi in response');
  process.exit(1);
}

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

console.log(decoded[4]);
EOFNODE
)

echo -e "${GREEN}✓ SUBMISSION_QUERIES_HASH extracted${NC}"
echo ""
echo -e "${YELLOW}SUBMISSION_QUERIES_HASH=${SUBMISSION_HASH}${NC}"
echo ""

echo -e "${GREEN}=== Summary ===${NC}"
echo ""
echo "Add these to your .env file:"
echo ""
echo -e "${YELLOW}REGISTRATION_QUERIES_HASH=${REGISTRATION_HASH}${NC}"
echo -e "${YELLOW}SUBMISSION_QUERIES_HASH=${SUBMISSION_HASH}${NC}"
echo ""

# Optionally update .env automatically
read -p "Update .env file automatically? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Update .env
    sed -i.bak "s/^REGISTRATION_QUERIES_HASH=.*/REGISTRATION_QUERIES_HASH=${REGISTRATION_HASH}/" .env
    sed -i.bak "s/^SUBMISSION_QUERIES_HASH=.*/SUBMISSION_QUERIES_HASH=${SUBMISSION_HASH}/" .env
    echo -e "${GREEN}✓ .env file updated${NC}"
else
    echo "Please update .env manually"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
