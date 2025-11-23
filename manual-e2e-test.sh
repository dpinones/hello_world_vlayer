11#!/bin/bash

set -e  # Exit on error

echo "=== Manual E2E Flow Test ==="
echo ""

# Verificar variables de entorno
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN no configurado"
  exit 1
fi

if [ -z "$WEB_PROVER_API_CLIENT_ID" ] || [ -z "$WEB_PROVER_API_SECRET" ]; then
  echo "Error: WEB_PROVER_API credentials no configuradas"
  exit 1
fi

if [ -z "$ZK_PROVER_GUEST_ID" ]; then
  echo "Error: ZK_PROVER_GUEST_ID no configurado"
  exit 1
fi

echo "✓ Variables de entorno verificadas"

# Configuración
GITHUB_LOGIN=${GITHUB_LOGIN:-"Chmarusso"}
GITHUB_REPO_OWNER=${GITHUB_REPO_OWNER:-"vlayer-xyz"}
GITHUB_REPO_NAME=${GITHUB_REPO_NAME:-"vlayer"}
NEXT_PORT=${NEXT_PORT:-3000}
ANVIL_RPC_URL=${ANVIL_RPC_URL:-"http://127.0.0.1:8545"}
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

echo ""
echo "Configuración:"
echo "  - Usuario GitHub: $GITHUB_LOGIN"
echo "  - Owner: $GITHUB_REPO_OWNER"
echo "  - Repositorio: $GITHUB_REPO_NAME"
echo "  - Next.js Port: $NEXT_PORT"
echo "  - Anvil RPC URL: $ANVIL_RPC_URL"

# Obtener dirección del contrato
if [ ! -f "contracts/deployments/anvil.json" ]; then
  echo "Error: No se encuentra contracts/deployments/anvil.json"
  echo "Por favor, despliega el contrato primero con: cd contracts && npm run deploy:anvil"
  exit 1
fi

CONTRACT_ADDRESS=$(cat contracts/deployments/anvil.json | jq -r '.contractAddress')
echo "  - Contract Address: $CONTRACT_ADDRESS"

# Verificar que Anvil esté corriendo
echo ""
echo "Verificando servicios..."
if ! curl -s -X POST $ANVIL_RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
  echo "Error: Anvil no está corriendo en $ANVIL_RPC_URL"
  exit 1
fi
echo "✓ Anvil corriendo"

# Verificar que Next.js esté corriendo
if ! curl -s "http://127.0.0.1:${NEXT_PORT}" > /dev/null; then
  echo "Error: Next.js no está corriendo en puerto $NEXT_PORT"
  exit 1
fi
echo "✓ Next.js corriendo"

# Paso 1: Prove
echo ""
echo "======================================="
echo "Paso 1: Llamando a /api/prove..."
echo "======================================="

QUERY='query($login: String!, $owner: String!, $name: String!, $q: String!) { repository(owner: $owner, name: $name) { name nameWithOwner owner { login } } mergedPRs: search(type: ISSUE, query: $q) { issueCount } user(login: $login) { login } }'

echo "Query variables:"
echo "  - login: $GITHUB_LOGIN"
echo "  - owner: $GITHUB_REPO_OWNER"
echo "  - name: $GITHUB_REPO_NAME"
echo "  - q: repo:$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME is:pr is:merged author:$GITHUB_LOGIN"

curl -s -X POST "http://127.0.0.1:${NEXT_PORT}/api/prove" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$QUERY\",\"variables\":{\"login\":\"$GITHUB_LOGIN\",\"owner\":\"$GITHUB_REPO_OWNER\",\"name\":\"$GITHUB_REPO_NAME\",\"q\":\"repo:$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME is:pr is:merged author:$GITHUB_LOGIN\"},\"githubToken\":\"$GITHUB_TOKEN\"}" \
  > /tmp/presentation.json

if [ $? -ne 0 ]; then
  echo "✗ Error al llamar a /api/prove"
  exit 1
fi

echo "✓ Presentation recibida"
echo "Presentation preview:"
cat /tmp/presentation.json | jq . | head -n 20

# Paso 2: Compress
echo ""
echo "======================================="
echo "Paso 2: Llamando a /api/compress..."
echo "======================================="

PRESENTATION=$(cat /tmp/presentation.json)
curl -s -X POST "http://127.0.0.1:${NEXT_PORT}/api/compress" \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$PRESENTATION,\"username\":\"$GITHUB_LOGIN\"}" \
  > /tmp/compression.json

if [ $? -ne 0 ]; then
  echo "✗ Error al llamar a /api/compress"
  exit 1
fi

echo "✓ Compression completada"
echo "Compression payload preview:"
cat /tmp/compression.json | jq . | head -n 20

# Paso 3: Extraer datos
echo ""
echo "======================================="
echo "Paso 3: Extrayendo zkProof y journalData"
echo "======================================="

ZK_PROOF=$(cat /tmp/compression.json | jq -r '.data.zkProof // .zkProof')
JOURNAL_DATA=$(cat /tmp/compression.json | jq -r '.data.journalDataAbi // .journalDataAbi')

if [ -z "$ZK_PROOF" ] || [ "$ZK_PROOF" = "null" ]; then
  echo "✗ Error: No se pudo extraer zkProof"
  cat /tmp/compression.json | jq .
  exit 1
fi

if [ -z "$JOURNAL_DATA" ] || [ "$JOURNAL_DATA" = "null" ]; then
  echo "✗ Error: No se pudo extraer journalData"
  cat /tmp/compression.json | jq .
  exit 1
fi

echo "✓ Datos extraídos"
echo "  - zkProof length: ${#ZK_PROOF}"
echo "  - journalData length: ${#JOURNAL_DATA}"
echo "  - zkProof preview: ${ZK_PROOF:0:66}..."
echo "  - journalData preview: ${JOURNAL_DATA:0:66}..."

# Paso 4: Enviar transacción
echo ""
echo "======================================="
echo "Paso 4: Enviando transacción on-chain..."
echo "======================================="

cd contracts

echo "Llamando submitContribution en $CONTRACT_ADDRESS..."
TX_OUTPUT=$(cast send $CONTRACT_ADDRESS \
  "submitContribution(bytes,bytes)" \
  "$JOURNAL_DATA" \
  "$ZK_PROOF" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ANVIL_RPC_URL \
  --json)

if [ $? -ne 0 ]; then
  echo "✗ Error al enviar transacción"
  exit 1
fi

TX_HASH=$(echo $TX_OUTPUT | jq -r '.transactionHash')
echo "✓ Transacción enviada"
echo "  - Transaction Hash: $TX_HASH"

# Paso 5: Verificar transacción
echo ""
echo "======================================="
echo "Paso 5: Verificando transacción..."
echo "======================================="

RECEIPT=$(cast receipt $TX_HASH --rpc-url $ANVIL_RPC_URL --json)
STATUS=$(echo $RECEIPT | jq -r '.status')
GAS_USED=$(echo $RECEIPT | jq -r '.gasUsed')

echo "Receipt:"
echo "  - Status: $STATUS"
echo "  - Gas Used: $GAS_USED"

if [ "$STATUS" = "0x1" ]; then
  echo "✓ Transacción exitosa"
else
  echo "✗ Transacción falló (status: $STATUS)"
  exit 1
fi

# Paso 6: Leer contribuciones
echo ""
echo "======================================="
echo "Paso 6: Leyendo contribuciones del contrato..."
echo "======================================="

REPO_NAME_WITH_OWNER="$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME"

echo "Leyendo contributionsByRepoAndUser..."
echo "  - Repo: $REPO_NAME_WITH_OWNER"
echo "  - Username: $GITHUB_LOGIN"

STORED=$(cast call $CONTRACT_ADDRESS \
  "contributionsByRepoAndUser(string,string)(uint256)" \
  "$REPO_NAME_WITH_OWNER" \
  "$GITHUB_LOGIN" \
  --rpc-url $ANVIL_RPC_URL)

if [ $? -ne 0 ]; then
  echo "✗ Error al leer contribuciones del contrato"
  exit 1
fi

# Convertir de hex a decimal si es necesario
STORED_DEC=$(printf "%d" $STORED)

echo "✓ Contributions almacenadas en el contrato: $STORED_DEC"

echo ""
echo "======================================="
echo "=== Test completado exitosamente ==="
echo "======================================="
echo ""
echo "Resumen:"
echo "  - Usuario: $GITHUB_LOGIN"
echo "  - Repositorio: $REPO_NAME_WITH_OWNER"
echo "  - Contributions verificadas: $STORED_DEC"
echo "  - Transaction Hash: $TX_HASH"
echo "  - Contract Address: $CONTRACT_ADDRESS"
echo ""
