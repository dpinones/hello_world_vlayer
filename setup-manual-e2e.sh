#!/bin/bash

# Script para configurar el entorno antes de ejecutar el manual E2E test

echo "=== Setup Manual E2E Environment ==="
echo ""

# Verificar si el archivo .env existe
if [ -f ".env" ]; then
  echo "Cargando variables de .env..."
  export $(cat .env | grep -v '^#' | xargs)
  echo "✓ Variables cargadas desde .env"
else
  echo "⚠ No se encontró archivo .env"
  echo "Asegúrate de configurar las siguientes variables:"
  echo "  - WEB_PROVER_API_CLIENT_ID"
  echo "  - WEB_PROVER_API_SECRET"
  echo "  - ZK_PROVER_GUEST_ID"
fi

# Configurar variables por defecto
export GITHUB_LOGIN=${GITHUB_LOGIN:-"Chmarusso"}
export GITHUB_REPO_OWNER=${GITHUB_REPO_OWNER:-"vlayer-xyz"}
export GITHUB_REPO_NAME=${GITHUB_REPO_NAME:-"vlayer"}
export NEXT_PORT=${NEXT_PORT:-3000}
export ANVIL_PORT=${ANVIL_PORT:-8545}
export ANVIL_RPC_URL="http://127.0.0.1:${ANVIL_PORT}"
export ZK_PROVER_API_URL=${ZK_PROVER_API_URL:-"https://zk-prover.vlayer.xyz/api/v0"}

echo ""
echo "Variables configuradas:"
echo "  GITHUB_TOKEN: ${GITHUB_TOKEN:0:10}..."
echo "  GITHUB_LOGIN: $GITHUB_LOGIN"
echo "  GITHUB_REPO_OWNER: $GITHUB_REPO_OWNER"
echo "  GITHUB_REPO_NAME: $GITHUB_REPO_NAME"
echo "  WEB_PROVER_API_CLIENT_ID: ${WEB_PROVER_API_CLIENT_ID:0:10}..."
echo "  WEB_PROVER_API_SECRET: ${WEB_PROVER_API_SECRET:0:10}..."
echo "  ZK_PROVER_GUEST_ID: $ZK_PROVER_GUEST_ID"
echo "  ZK_PROVER_API_URL: $ZK_PROVER_API_URL"
echo "  NEXT_PORT: $NEXT_PORT"
echo "  ANVIL_PORT: $ANVIL_PORT"
echo "  ANVIL_RPC_URL: $ANVIL_RPC_URL"

echo ""
echo "=== Verificando servicios necesarios ==="

# Verificar que Anvil esté corriendo
echo ""
echo "1. Verificando Anvil..."
if curl -s -X POST $ANVIL_RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
  echo "   ✓ Anvil está corriendo en $ANVIL_RPC_URL"
else
  echo "   ✗ Anvil NO está corriendo"
  echo ""
  echo "   Para iniciar Anvil, ejecuta en otra terminal:"
  echo "   anvil --host 127.0.0.1 --port $ANVIL_PORT --chain-id 31337"
  exit 1
fi

# Verificar que el contrato esté desplegado
echo ""
echo "2. Verificando deployment del contrato..."
if [ -f "contracts/deployments/anvil.json" ]; then
  CONTRACT_ADDRESS=$(cat contracts/deployments/anvil.json | jq -r '.contractAddress')
  echo "   ✓ Contrato desplegado en: $CONTRACT_ADDRESS"
  export NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
else
  echo "   ✗ No se encuentra el archivo de deployment"
  echo ""
  echo "   Para desplegar el contrato, ejecuta:"
  echo "   cd contracts && npm run deploy:anvil"
  exit 1
fi

# Verificar que Next.js esté corriendo
echo ""
echo "3. Verificando Next.js..."
if curl -s "http://127.0.0.1:${NEXT_PORT}" > /dev/null; then
  echo "   ✓ Next.js está corriendo en puerto $NEXT_PORT"
else
  echo "   ✗ Next.js NO está corriendo"
  echo ""
  echo "   Para iniciar Next.js, ejecuta en otra terminal:"
  echo "   NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS \\"
  echo "   WEB_PROVER_API_URL=$WEB_PROVER_API_URL \\"
  echo "   WEB_PROVER_API_CLIENT_ID=$WEB_PROVER_API_CLIENT_ID \\"
  echo "   WEB_PROVER_API_SECRET=$WEB_PROVER_API_SECRET \\"
  echo "   ZK_PROVER_API_URL=$ZK_PROVER_API_URL \\"
  echo "   npx next dev -p $NEXT_PORT"
  exit 1
fi

echo ""
echo "=== ✓ Todos los servicios están listos ==="
echo ""
echo "Ahora puedes ejecutar el test manual:"
echo "./manual-e2e-test.sh"
echo ""
