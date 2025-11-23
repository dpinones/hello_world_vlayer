#!/bin/bash

JOURNAL_DATA=$(cat /tmp/compress_response.json | jq -r '.data.journalDataAbi')

echo "=== Decoding Journal Data ABI ==="
echo ""

cd contracts
cast abi-decode \
  "x(bytes32,string,string,uint256,bytes32,string,string,uint256,string)" \
  "$JOURNAL_DATA"
