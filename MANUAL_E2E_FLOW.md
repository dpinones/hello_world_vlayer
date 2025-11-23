# Manual E2E Flow - GitHub Contribution Verifier

Este documento describe cómo replicar manualmente el flujo del test E2E usando comandos de terminal.

## ✅ Test Ejecutado Exitosamente

El test manual se ejecutó con éxito y verificó:
- ✓ Llamada a `/api/prove` para generar presentation
- ✓ Llamada a `/api/compress` para comprimir el proof
- ✓ Envío de transacción on-chain con `submitContribution`
- ✓ Verificación de contributions guardadas en el contrato

**Resultado:** 4 contributions verificadas para el usuario `dpinones` en `dpinones/kanoodle-fusion`

## 🚀 Quick Start

Si solo quieres ejecutar el test completo automáticamente:

```bash
# 1. Inicia Anvil (en una terminal)
anvil --host 127.0.0.1 --port 8545 --chain-id 31337

# 2. Despliega el contrato (en otra terminal)
cd contracts && npm run deploy:anvil

# 3. Inicia Next.js (en otra terminal)
./start-next.sh

# 4. Ejecuta el test manual
./run-manual-test.sh
```

O usa el script de setup para verificar que todo esté listo:

```bash
./setup-manual-e2e.sh
```

## Prerequisitos

Asegúrate de tener configuradas estas variables de entorno:

```bash
export GITHUB_TOKEN="tu_github_token"
export WEB_PROVER_API_CLIENT_ID="tu_client_id"
export WEB_PROVER_API_SECRET="tu_secret"
export WEB_PROVER_API_URL="https://web-prover-api-url" # opcional
export ZK_PROVER_API_URL="https://zk-prover.vlayer.xyz/api/v0" # o tu URL
export ZK_PROVER_GUEST_ID="tu_guest_id"
```

## Configuración de parámetros

```bash
# Usuario y repositorio de GitHub
export GITHUB_LOGIN="Chmarusso"  # o tu usuario
export GITHUB_REPO_OWNER="vlayer-xyz"
export GITHUB_REPO_NAME="vlayer"

# Configuración de Anvil
export ANVIL_PORT=8545
export ANVIL_RPC_URL="http://127.0.0.1:${ANVIL_PORT}"
export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# Puerto para Next.js
export NEXT_PORT=3000
```

## Paso 1: Iniciar Anvil (Blockchain local)

```bash
# En una terminal separada
anvil --host 127.0.0.1 --port ${ANVIL_PORT} --chain-id 31337
```

Espera hasta ver: `Listening on 127.0.0.1:8545`

## Paso 2: Compilar contratos

```bash
cd contracts
forge build
```

## Paso 3: Desplegar el contrato en Anvil

```bash
cd contracts
npm run deploy:anvil
```

Esto generará un archivo `contracts/deployments/anvil.json` con la dirección del contrato.

```bash
# Obtener la dirección del contrato
export CONTRACT_ADDRESS=$(cat contracts/deployments/anvil.json | grep -o '"contractAddress":"[^"]*"' | cut -d'"' -f4)
echo "Contract deployed at: $CONTRACT_ADDRESS"
```

## Paso 4: Iniciar servidor Next.js

```bash
# En otra terminal separada, desde la raíz del proyecto
NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS \
WEB_PROVER_API_URL=$WEB_PROVER_API_URL \
WEB_PROVER_API_CLIENT_ID=$WEB_PROVER_API_CLIENT_ID \
WEB_PROVER_API_SECRET=$WEB_PROVER_API_SECRET \
ZK_PROVER_API_URL=$ZK_PROVER_API_URL \
npx next dev -p ${NEXT_PORT}
```

Espera hasta ver: `Ready in ...`

## Paso 5: Llamar a /api/prove

```bash
# Construir el query GraphQL
QUERY='query($login: String!, $owner: String!, $name: String!, $q: String!) {
  repository(owner: $owner, name: $name) { name nameWithOwner owner { login } }
  mergedPRs: search(type: ISSUE, query: $q) { issueCount }
  user(login: $login) { login }
}'

# Llamar a la API prove
curl -X POST "http://127.0.0.1:${NEXT_PORT}/api/prove" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"$QUERY\",
    \"variables\": {
      \"login\": \"$GITHUB_LOGIN\",
      \"owner\": \"$GITHUB_REPO_OWNER\",
      \"name\": \"$GITHUB_REPO_NAME\",
      \"q\": \"repo:$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME is:pr is:merged author:$GITHUB_LOGIN\"
    },
    \"githubToken\": \"$GITHUB_TOKEN\"
  }" > /tmp/presentation.json

# Verificar respuesta
cat /tmp/presentation.json | jq .
```

## Paso 6: Llamar a /api/compress

```bash
# Leer la presentation del paso anterior
PRESENTATION=$(cat /tmp/presentation.json)

# Llamar a la API compress
curl -X POST "http://127.0.0.1:${NEXT_PORT}/api/compress" \
  -H "Content-Type: application/json" \
  -d "{
    \"presentation\": $PRESENTATION,
    \"username\": \"$GITHUB_LOGIN\"
  }" > /tmp/compression.json

# Verificar respuesta
cat /tmp/compression.json | jq .
```

## Paso 7: Extraer zkProof y journalDataAbi

```bash
# Extraer los datos necesarios
ZK_PROOF=$(cat /tmp/compression.json | jq -r '.data.zkProof // .zkProof')
JOURNAL_DATA=$(cat /tmp/compression.json | jq -r '.data.journalDataAbi // .journalDataAbi')

echo "ZK Proof: $ZK_PROOF"
echo "Journal Data: $JOURNAL_DATA"
```

## Paso 8: Enviar transacción al contrato

```bash
# Crear script para enviar la transacción
cd contracts

# Opción 1: Usando cast (de Foundry)
cast send $CONTRACT_ADDRESS \
  "submitContribution(bytes,bytes)" \
  "$JOURNAL_DATA" \
  "$ZK_PROOF" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ANVIL_RPC_URL

# Guardar el hash de la transacción
TX_HASH=$(cast send $CONTRACT_ADDRESS \
  "submitContribution(bytes,bytes)" \
  "$JOURNAL_DATA" \
  "$ZK_PROOF" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ANVIL_RPC_URL \
  --json | jq -r '.transactionHash')

echo "Transaction hash: $TX_HASH"
```

## Paso 9: Verificar la transacción

```bash
# Ver el recibo de la transacción
cast receipt $TX_HASH --rpc-url $ANVIL_RPC_URL

# Verificar el estado
cast receipt $TX_HASH --rpc-url $ANVIL_RPC_URL --json | jq -r '.status'
```

## Paso 10: Leer las contribuciones del contrato

```bash
# Leer las contribuciones guardadas
REPO_NAME_WITH_OWNER="$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME"

cast call $CONTRACT_ADDRESS \
  "contributionsByRepoAndUser(string,string)(uint256)" \
  "$REPO_NAME_WITH_OWNER" \
  "$GITHUB_LOGIN" \
  --rpc-url $ANVIL_RPC_URL
```

## Script completo automatizado

Guarda esto como `manual-e2e-test.sh`:

```bash
#!/bin/bash

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

# Obtener dirección del contrato
CONTRACT_ADDRESS=$(cat contracts/deployments/anvil.json | jq -r '.contractAddress')
echo "Contract Address: $CONTRACT_ADDRESS"

# Paso 1: Prove
echo ""
echo "Paso 1: Llamando a /api/prove..."

QUERY='query($login: String!, $owner: String!, $name: String!, $q: String!) { repository(owner: $owner, name: $name) { name nameWithOwner owner { login } } mergedPRs: search(type: ISSUE, query: $q) { issueCount } user(login: $login) { login } }'

curl -s -X POST "http://127.0.0.1:${NEXT_PORT}/api/prove" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$QUERY\",\"variables\":{\"login\":\"$GITHUB_LOGIN\",\"owner\":\"$GITHUB_REPO_OWNER\",\"name\":\"$GITHUB_REPO_NAME\",\"q\":\"repo:$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME is:pr is:merged author:$GITHUB_LOGIN\"},\"githubToken\":\"$GITHUB_TOKEN\"}" \
  > /tmp/presentation.json

echo "✓ Presentation recibida"

# Paso 2: Compress
echo ""
echo "Paso 2: Llamando a /api/compress..."

PRESENTATION=$(cat /tmp/presentation.json)
curl -s -X POST "http://127.0.0.1:${NEXT_PORT}/api/compress" \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$PRESENTATION,\"username\":\"$GITHUB_LOGIN\"}" \
  > /tmp/compression.json

echo "✓ Compression completada"

# Paso 3: Extraer datos
ZK_PROOF=$(cat /tmp/compression.json | jq -r '.data.zkProof // .zkProof')
JOURNAL_DATA=$(cat /tmp/compression.json | jq -r '.data.journalDataAbi // .journalDataAbi')

echo ""
echo "Paso 3: Datos extraídos"
echo "  - zkProof length: ${#ZK_PROOF}"
echo "  - journalData length: ${#JOURNAL_DATA}"

# Paso 4: Enviar transacción
echo ""
echo "Paso 4: Enviando transacción on-chain..."

cd contracts
TX_OUTPUT=$(cast send $CONTRACT_ADDRESS \
  "submitContribution(bytes,bytes)" \
  "$JOURNAL_DATA" \
  "$ZK_PROOF" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ANVIL_RPC_URL \
  --json)

TX_HASH=$(echo $TX_OUTPUT | jq -r '.transactionHash')
echo "✓ Transacción enviada: $TX_HASH"

# Paso 5: Verificar transacción
echo ""
echo "Paso 5: Verificando transacción..."
STATUS=$(cast receipt $TX_HASH --rpc-url $ANVIL_RPC_URL --json | jq -r '.status')

if [ "$STATUS" = "0x1" ]; then
  echo "✓ Transacción exitosa (status: $STATUS)"
else
  echo "✗ Transacción falló (status: $STATUS)"
  exit 1
fi

# Paso 6: Leer contribuciones
echo ""
echo "Paso 6: Leyendo contribuciones del contrato..."
REPO_NAME_WITH_OWNER="$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME"

STORED=$(cast call $CONTRACT_ADDRESS \
  "contributionsByRepoAndUser(string,string)(uint256)" \
  "$REPO_NAME_WITH_OWNER" \
  "$GITHUB_LOGIN" \
  --rpc-url $ANVIL_RPC_URL)

echo "✓ Contributions almacenadas: $STORED"

echo ""
echo "=== Test completado exitosamente ==="
```

Haz el script ejecutable:

```bash
chmod +x manual-e2e-test.sh
```

## Ejecución

1. Asegúrate de que Anvil esté corriendo
2. Asegúrate de que el contrato esté desplegado
3. Asegúrate de que Next.js esté corriendo
4. Ejecuta: `./manual-e2e-test.sh`
