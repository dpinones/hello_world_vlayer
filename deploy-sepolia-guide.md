# Deploy en Sepolia - Guía Paso a Paso

## 📋 Configuración Actual

✅ **Private Key:** Configurada
✅ **RPC URL:** https://sepolia.drpc.org
✅ **Verifier Address:** 0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187 (RISC Zero oficial)
✅ **ZK Prover Guest ID:** 0x6a555e28e0d59c20ad0dc76dfa07328f2f68638827dafef87178b306fb02e608

**Tu dirección de wallet:** `0xEBdf70B26e5e7520B8B79e1D01eD832f48972B09`

---

## ⚠️ PASO 1: Conseguir ETH de testnet

Tu wallet actualmente tiene **0 ETH** en Sepolia. Necesitas fondos para hacer el deploy.

### Faucets de Sepolia ETH:

1. **Alchemy Sepolia Faucet** (Recomendado)
   - URL: https://sepoliafaucet.com/
   - Requiere: Cuenta de Alchemy (gratis)
   - Cantidad: 0.5 ETH cada 24h

2. **QuickNode Faucet**
   - URL: https://faucet.quicknode.com/ethereum/sepolia
   - Requiere: Cuenta de QuickNode (gratis)

3. **Infura Faucet**
   - URL: https://www.infura.io/faucet/sepolia
   - Requiere: Cuenta de Infura (gratis)

4. **Google Cloud Web3 Faucet**
   - URL: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
   - Requiere: Cuenta de Google

**Dirección para recibir fondos:** `0xEBdf70B26e5e7520B8B79e1D01eD832f48972B09`

---

## 🔍 PASO 2: Verificar balance

Después de recibir ETH del faucet, verifica tu balance:

```bash
cd contracts
cast balance 0xEBdf70B26e5e7520B8B79e1D01eD832f48972B09 --rpc-url https://sepolia.drpc.org
```

Deberías ver un número mayor a 0 (el balance se muestra en wei).

---

## 🚀 PASO 3: Deploy del contrato

Una vez que tengas ETH en Sepolia, ejecuta:

```bash
cd contracts
npm run deploy:sepolia
```

El script automáticamente:
1. ✅ Usa tu private key del .env
2. ✅ Se conecta a Sepolia via https://sepolia.drpc.org
3. ✅ Usa el verifier público de RISC Zero (0x925d8331...)
4. ✅ Despliega el contrato GitHubContributionVerifier
5. ✅ Guarda la información en `deployments/sepolia.json`

---

## 📊 PASO 4: Verificar deployment

El script mostrará algo como:

```
=== Deploying to sepolia ===

Network: sepolia
Chain ID: 11155111
RPC URL: https://sepolia.drpc.org

Deployer address: 0xEBdf70B26e5e7520B8B79e1D01eD832f48972B09
Balance: 500000000000000000 wei (0.5 ETH)

Deployment Parameters:
  Verifier: 0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187
  Image ID: 0x6a555e28e0d59c20ad0dc76dfa07328f2f68638827dafef87178b306fb02e608
  Notary Key Fingerprint: 0xa7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af
  Queries Hash: 0x85db70a06280c1096181df15a8c754a968a0eb669b34d686194ce1faceb5c6c6
  Expected URL: https://api.github.com/graphql

✓ Contract deployed successfully!
  Address: 0x... (tu nuevo contrato)
  Block: 12345
  Gas used: 508098
```

---

## 🔗 PASO 5: Verificar en Etherscan

Visita tu contrato en Sepolia Etherscan:

```
https://sepolia.etherscan.io/address/TU_CONTRACT_ADDRESS
```

---

## 📝 PASO 6: Actualizar configuración de Next.js

Después del deployment, actualiza el .env en la raíz del proyecto:

```bash
# En el archivo .env de la raíz (no en contracts/)
NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS=TU_CONTRACT_ADDRESS_EN_SEPOLIA
```

O crea una variable específica para Sepolia:

```bash
NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=TU_CONTRACT_ADDRESS_EN_SEPOLIA
```

---

## 🧪 PASO 7: Probar el contrato

Puedes probar el contrato usando el manual E2E test modificado para Sepolia:

```bash
# Modificar las variables de entorno para apuntar a Sepolia
export ANVIL_RPC_URL=https://sepolia.drpc.org
export CONTRACT_ADDRESS=TU_CONTRACT_ADDRESS_EN_SEPOLIA

# Ejecutar el test
./manual-e2e-test.sh
```

---

## 💰 Costo Estimado

- **Deployment del contrato:** ~0.001-0.003 ETH
- **Submit contribution (cada vez):** ~0.0001-0.0003 ETH

Con 0.5 ETH de testnet deberías tener suficiente para muchas pruebas.

---

## ❓ Troubleshooting

### Error: "Deployer has no funds"
- Asegúrate de haber recibido ETH del faucet
- Verifica el balance con `cast balance`

### Error: "RPC connection failed"
- Verifica que https://sepolia.drpc.org esté disponible
- Puedes cambiar a otro RPC si es necesario:
  ```bash
  # Opciones alternativas:
  https://rpc.sepolia.org
  https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
  ```

### Error: "Invalid verifier address"
- Asegúrate de que el verifier está correctamente configurado en .env
- Dirección correcta: 0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187

---

## 🎯 Resumen Rápido

```bash
# 1. Conseguir ETH de faucet para: 0xEBdf70B26e5e7520B8B79e1D01eD832f48972B09

# 2. Verificar balance
cd contracts
cast balance 0xEBdf70B26e5e7520B8B79e1D01eD832f48972B09 --rpc-url https://sepolia.drpc.org

# 3. Deploy
npm run deploy:sepolia

# 4. Copiar contract address del output

# 5. Actualizar .env en raíz
echo "NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=0x..." >> ../.env
```

¡Listo para hacer deploy! 🚀
