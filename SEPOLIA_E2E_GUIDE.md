# Guía de Testing E2E en Sepolia

Esta guía te ayudará a desplegar y probar el flujo completo en Sepolia testnet.

## Pre-requisitos

### 1. Configurar RPC URL de Sepolia

Necesitas un RPC endpoint de Sepolia. Opciones:

**Opción A: Alchemy (Recomendado)**
1. Ve a https://dashboard.alchemy.com/
2. Crea una cuenta gratuita
3. Crea una nueva app para "Ethereum Sepolia"
4. Copia la HTTP URL
5. Actualiza tu `.env`:
   ```bash
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
   ```

**Opción B: Infura**
1. Ve a https://infura.io/
2. Crea una cuenta
3. Crea un nuevo proyecto
4. Activa Sepolia
5. Actualiza tu `.env`:
   ```bash
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/TU_PROJECT_ID
   ```

**Opción C: RPC Público (No recomendado para producción)**
```bash
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 2. Obtener ETH de Sepolia

Necesitas ETH en Sepolia para el deployment. Usa estos faucets:

1. **Alchemy Faucet**: https://sepoliafaucet.com/
2. **Infura Faucet**: https://www.infura.io/faucet/sepolia
3. **QuickNode Faucet**: https://faucet.quicknode.com/ethereum/sepolia

**Dirección de tu wallet:**
```bash
cast wallet address $PRIVATE_KEY
```

Necesitas al menos 0.1 ETH para el deployment del contrato + mock verifier.

### 3. Verificar tu configuración en `.env`

Asegúrate de tener estos valores configurados:

```bash
# Wallet
PRIVATE_KEY=0x...

# RPC
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# ZK Prover
ZK_PROVER_GUEST_ID=0x6a555e28e0d59c20ad0dc76dfa07328f2f68638827dafef87178b306fb02e608

# Web Prover API (para generar pruebas)
WEB_PROVER_API_CLIENT_ID=cb6fe73a-e61d-48e4-8358-64e9f0069e4e
WEB_PROVER_API_SECRET=LBvG4eL0oZ5BnReWAScT3TzoPWgCeEFSa0uGeM5JfMOpgfqdGTXL0uSmfX7AyaVW

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_LOGIN=tu_usuario
```

## Deployment Automatizado

### Opción 1: Script Automático (Recomendado)

El script `run-sepolia-test.sh` hace todo por ti:

```bash
./run-sepolia-test.sh
```

Este script:
1. ✅ Compila los contratos
2. ✅ Despliega el contrato en Sepolia (incluyendo mock verifier)
3. ✅ Actualiza el `.env` con la nueva dirección del contrato
4. ✅ Muestra el balance del deployer
5. ✅ Te da instrucciones para continuar

### Opción 2: Paso a Paso Manual

Si prefieres hacerlo manualmente:

```bash
# 1. Compilar contratos
cd contracts
forge build

# 2. Desplegar en Sepolia (sin pasar verifier address = usa mock)
npm run deploy sepolia

# 3. Copiar la dirección del contrato del output y actualizar .env
# Busca "Contract Address: 0x..."
echo "NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=0x..." >> ../.env
```

## Testing del Frontend

### 1. Iniciar el servidor de desarrollo

```bash
npm run dev
```

El frontend se iniciará en http://localhost:3000

### 2. Configurar tu Wallet (MetaMask)

1. **Agregar Sepolia a MetaMask** (si no lo tienes):
   - Network Name: `Sepolia`
   - RPC URL: `https://rpc.sepolia.org` (o tu Alchemy/Infura URL)
   - Chain ID: `11155111`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.etherscan.io`

2. **Importar tu wallet de prueba** (la del PRIVATE_KEY):
   - MetaMask → Import Account → Enter Private Key

3. **Conseguir ETH de testnet** (para gas):
   - Usa los faucets mencionados arriba
   - Necesitas ~0.01 ETH para submit on-chain

### 3. Probar el Flujo Completo

1. **Abrir la app**: http://localhost:3000

2. **Conectar wallet**:
   - Click en "Connect Wallet"
   - Selecciona MetaMask
   - Aprueba la conexión

3. **Seleccionar Sepolia**:
   - Asegúrate de que MetaMask esté en Sepolia
   - La app debería mostrar "Sepolia" como red disponible

4. **Ingresar datos**:
   - GitHub Repo URL: `https://github.com/OWNER/REPO`
   - Esto debe coincidir con tu GITHUB_LOGIN y GITHUB_REPO configurados

5. **Generar Proof**:
   - Click en "Generate Proof"
   - Espera ~1-2 minutos (proceso ZK)
   - Verás el proof generado

6. **Submit On-Chain**:
   - Click en "Submit On-Chain"
   - Selecciona "Sepolia" en el dropdown
   - Aprueba la transacción en MetaMask
   - Espera confirmación (~15-30 segundos)

7. **Verificar en Etherscan**:
   - La app te mostrará un link a Sepolia Etherscan
   - Verifica que la transacción fue exitosa
   - Link: https://sepolia.etherscan.io/tx/TX_HASH

## Verificación del Contrato

Para verificar tu contrato en Sepolia Etherscan:

```bash
cd contracts
forge verify-contract \
  0xTU_CONTRACT_ADDRESS \
  GitHubContributionVerifier \
  --chain sepolia \
  --watch
```

## Troubleshooting

### Error: "SEPOLIA_RPC_URL not set"
- Configura `SEPOLIA_RPC_URL` en tu `.env`

### Error: "Deployer has no funds"
- Necesitas ETH de Sepolia
- Usa los faucets mencionados arriba

### Error: "Transaction reverted on-chain"
- Verifica que el mock verifier esté desplegado correctamente
- Verifica que el `ZK_PROVER_GUEST_ID` sea correcto
- Checa los logs en Etherscan

### Frontend no muestra Sepolia
- Verifica que `NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS` esté en `.env`
- Verifica que `NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111` esté en `.env`
- Reinicia el servidor (`npm run dev`)

### MetaMask no aprueba la transacción
- Verifica que tengas ETH en Sepolia
- Verifica que estés en la red correcta (Sepolia)
- Intenta aumentar el gas limit

## Diferencias con Mock Verifier

⚠️ **IMPORTANTE**: Estás usando `RiscZeroMockVerifier` en Sepolia.

**Qué significa:**
- ✅ El mock verifier acepta TODAS las pruebas
- ✅ Perfecto para testing y desarrollo
- ❌ NO validar realmente las pruebas ZK
- ❌ NO usar en producción

**Para producción**, necesitarías usar el verifier real de RISC Zero:
```bash
npm run deploy sepolia 0xVERIFIER_ADDRESS_REAL
```

Direcciones de verifiers reales: https://dev.risczero.com/api/blockchain-integration/contracts

## Testing con Proof Real vs Mock

Aunque uses mock verifier, el sistema SIGUE generando pruebas ZK reales:

1. ✅ **Proof Generation**: Se genera una prueba ZK real usando RISC Zero
2. ✅ **Journal Data**: Se incluyen datos reales (username, repo, contributions)
3. ✅ **Contract Submission**: Se envía a la blockchain
4. ⚠️ **Verification**: El mock verifier acepta sin validar la criptografía

Esto te permite probar todo el flujo end-to-end excepto la verificación criptográfica final.

## Next Steps

Una vez que hayas probado todo en Sepolia:

1. **Deploy a mainnet** (con verifier real):
   ```bash
   npm run deploy mainnet 0xREAL_VERIFIER_ADDRESS
   ```

2. **Configurar el frontend para mainnet**:
   ```bash
   NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=1
   ```

3. **Testing adicional**:
   - Probar con diferentes repos
   - Probar con diferentes usuarios
   - Verificar edge cases

## Recursos

- **Sepolia Etherscan**: https://sepolia.etherscan.io
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **RISC Zero Docs**: https://dev.risczero.com/
- **Viem Docs**: https://viem.sh/

## Resumen del Flujo

```
1. Usuario ingresa repo URL
   ↓
2. Frontend consulta GitHub API (via TLSNotary)
   ↓
3. Se genera prueba ZK con RISC Zero
   ↓
4. Usuario firma transacción en MetaMask (Sepolia)
   ↓
5. Smart contract valida con Mock Verifier
   ↓
6. Transacción confirmada en blockchain
   ↓
7. Usuario ve confirmación + link a Etherscan
```
