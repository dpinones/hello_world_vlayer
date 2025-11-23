# TikTok Campaign Verifier V2 - Guía del Frontend

## 🎉 Estado: IMPLEMENTACIÓN COMPLETA

### 📍 Información del Contrato

- **Dirección**: `0xab76c932f811f30c96eb48a2c873fefc9e98f2d3`
- **Red**: Sepolia Testnet
- **Etherscan**: https://sepolia.etherscan.io/address/0xab76c932f811f30c96eb48a2c873fefc9e98f2d3
- **Estado**: ✅ Verificado y funcional

### 🌐 Servidor de Desarrollo

```bash
# El servidor ya está corriendo en:
http://localhost:3000

# Para iniciarlo manualmente (si está detenido):
npm run dev
```

---

## 📦 Arquitectura de Hooks

### 1. `useCampaignState`
Maneja el estado global de la campaña y las estadísticas.

**Funciones principales:**
- `refreshCampaignState()` - Actualiza estadísticas
- `advanceState()` - Avanza al siguiente estado (solo admin)
- `isHandleRegistered(handle)` - Verifica si un handle está registrado
- `getHandleScore(handle)` - Obtiene el score de un handle

**Estado retornado:**
- `stats` - Registered, submitted, totalScore
- `currentState` - 0: Registration, 1: WaitingForProofs, 2: Claimable
- `isLoading`, `error`

### 2. `useRegistration`
Maneja la generación de pruebas de registro (2 campos).

**Funciones principales:**
- `createRegistrationProof()` - Flujo completo (prove + compress)
- `generateRegistrationProof()` - Llama a `/api/prove-register`
- `compressRegistrationProof()` - Llama a `/api/compress-register`

**Datos extraídos:**
- `campaign_id` - "cmp_001"
- `handle_tiktok` - Handle del influencer

### 3. `useRegisterOnChain`
Envía el registro al blockchain.

**Funciones principales:**
- `submitRegistration(proof)` - Llama a `register(bytes, bytes)`
- `checkRegistration(handle)` - Verifica si ya está registrado
- `getRegisteredHandles()` - Lista todos los handles registrados

**Errores manejados:**
- AlreadyRegistered
- InvalidState
- InvalidNotaryKeyFingerprint
- InvalidQueriesHash
- ZKProofVerificationFailed

### 4. `useSubmission`
Maneja la generación de pruebas de participación (4 campos).

**Funciones principales:**
- `createSubmissionProof()` - Flujo completo (prove + compress)
- `generateSubmissionProof()` - Llama a `/api/prove`
- `compressSubmissionProof()` - Llama a `/api/compress`

**Datos extraídos:**
- `campaign_id` - "cmp_001"
- `handle_tiktok` - Handle del influencer
- `score_calidad` - Score 1-100
- `url_video` - URL del video

**Estado local:**
- `handleTiktok` - Input del usuario
- `setHandleTiktok()` - Para actualizar el input

### 5. `useSubmitOnChain`
Envía las pruebas de participación al blockchain.

**Funciones principales:**
- `submitCampaignProof(proof)` - Llama a `submitCampaign(bytes, bytes)`
- `getHandleScore(handle)` - Obtiene el score almacenado
- `getTotalScore()` - Score total de todos los participantes

**Errores manejados:**
- NotRegistered
- AlreadySubmitted
- InvalidState
- InvalidScore
- ZKProofVerificationFailed

### 6. `useClaimReward`
Maneja la reclamación de recompensas WETH.

**Funciones principales:**
- `claimReward(handle)` - Llama a `claimReward(string)`
- `getRewardAmount(handle)` - Calcula WETH a recibir
- `getRewardPercentage(handle)` - Calcula % del pool
- `hasClaimed(handle)` - Verifica si ya reclamó

**Cálculo de recompensa:**
```solidity
reward = (totalWETH * myScore) / totalScore
percentage = (myScore / totalScore) * 100
```

---

## 🎯 Flujo Completo de Usuario

### Fase 1: Registration (Estado 0)

1. Usuario ingresa su handle de TikTok
2. Click en "Register for Campaign"
3. Sistema:
   - Llama a `/api/prove-register` (GET a register_user.json)
   - Extrae: `campaign_id`, `handle_tiktok`
   - Genera ZK proof (~30-60 segundos)
   - Llama a `/api/compress-register`
   - Comprime la prueba
4. Usuario confirma transacción en wallet
5. Smart contract valida:
   - ✅ Estado = Registration
   - ✅ Notary key fingerprint
   - ✅ QUERIES_HASH = REGISTRATION_QUERIES_HASH
   - ✅ URL = REGISTRATION_URL
   - ✅ Campaign ID = "cmp_001"
   - ✅ Handle no vacío y no registrado
   - ✅ ZK proof válido
6. Handle registrado ✅

### Transición: Avance de Estado

- Admin hace click en "Advance to WaitingForProofs"
- Estado cambia de 0 → 1

### Fase 2: WaitingForProofs (Estado 1)

1. Usuario (ya registrado) hace click en "Submit Campaign Proof"
2. Sistema:
   - Llama a `/api/prove` (GET a mockTikTokVideosResponse.json)
   - Extrae: `campaign_id`, `handle_tiktok`, `score_calidad`, `url_video`
   - Genera ZK proof (~30-60 segundos)
   - Llama a `/api/compress`
   - Comprime la prueba
3. Usuario confirma transacción
4. Smart contract valida:
   - ✅ Estado = WaitingForProofs
   - ✅ Handle está registrado
   - ✅ No ha enviado prueba antes
   - ✅ Notary key fingerprint
   - ✅ QUERIES_HASH = SUBMISSION_QUERIES_HASH
   - ✅ URL = SUBMISSION_URL
   - ✅ Score entre 1-100
   - ✅ ZK proof válido
5. Score almacenado y sumado al totalScore ✅

### Transición: Avance de Estado

- Admin hace click en "Advance to Claimable"
- Estado cambia de 1 → 2

### Fase 3: Claimable (Estado 2)

1. Usuario ve:
   - Su reward en WETH
   - Su % del pool total
2. Click en "Claim WETH Rewards"
3. Sistema verifica:
   - Handle registrado
   - Score > 0
   - No ha reclamado antes
4. Smart contract:
   - Calcula recompensa proporcional
   - Transfiere WETH al usuario
   - Marca como reclamado
5. Recompensa recibida ✅

---

## 🎨 Características del UI

### Panel de Estadísticas
```tsx
- State: "Registration" | "Waiting for Proofs" | "Claimable"
- Registered: Número de influencers registrados
- Submitted: Número de pruebas enviadas
- Total Score: Suma de todos los scores
```

### Validaciones
- ✅ Wallet conectada
- ✅ Red correcta (Sepolia)
- ✅ Handle no vacío
- ✅ Estado de campaña adecuado
- ✅ No duplicar acciones (ya registrado, ya enviado, ya reclamado)

### Estados de Carga
- "Generating Registration Proof..."
- "Generating Submission Proof..."
- "Submitting to Blockchain..."
- "Claiming..."

### Mensajes de Error
Todos los errores del contrato se parsean a mensajes legibles:
- "This handle is already registered"
- "Campaign is not in Registration state"
- "Invalid TLS notary key fingerprint"
- "Handle must be registered before submitting proof"
- etc.

### Enlaces a Etherscan
Cada transacción exitosa muestra un link a:
```
https://sepolia.etherscan.io/tx/{txHash}
```

---

## 🧪 Cómo Probar

### Preparación

1. Asegúrate de tener MetaMask instalado
2. Cambia a Sepolia Testnet
3. Necesitas Sepolia ETH para gas (obtener en https://sepoliafaucet.com)

### Prueba Paso a Paso

```bash
# 1. Abre el navegador
http://localhost:3000

# 2. Conecta tu wallet (top-right)
Click en "Connect Wallet"

# 3. Estado: Registration
- Ingresa handle: @happy_hasbulla_
- Click "Register for Campaign"
- Espera ~30-60 segundos
- Confirma transacción en MetaMask
- ✅ Verás "Registration successful!"

# 4. Avanza el estado (solo si eres el deployer)
- Click "Advance to WaitingForProofs"
- Confirma transacción
- ✅ Estado cambia a "Waiting for Proofs"

# 5. Estado: WaitingForProofs
- Click "Submit Campaign Proof"
- Espera ~30-60 segundos
- Confirma transacción
- ✅ Verás "Submission successful! Score: X"

# 6. Avanza el estado
- Click "Advance to Claimable"
- Confirma transacción
- ✅ Estado cambia a "Claimable"

# 7. Estado: Claimable
- Verás tu recompensa: "X WETH"
- Verás tu share: "X%"
- Click "Claim WETH Rewards"
- Confirma transacción
- ✅ WETH transferido a tu wallet
```

### Probar con Múltiples Usuarios

Para simular múltiples influencers, necesitas:
1. Múltiples wallets (cuentas de MetaMask)
2. Cada uno registra su handle
3. Cada uno envía su prueba
4. Cada uno reclama su recompensa proporcional

**Ejemplo con 3 usuarios:**
- User A: score 30 → recibe 30% del pool
- User B: score 50 → recibe 50% del pool
- User C: score 20 → recibe 20% del pool
- Total: 100 → 100% del pool distribuido

---

## 📊 Monitoreo

### Ver Estado On-Chain

```bash
# Desde terminal:
cd contracts

# Ver estado actual
cast call $CONTRACT "currentState()(uint8)" --rpc-url $RPC

# Ver estadísticas
cast call $CONTRACT "getCampaignStats()(uint256,uint256,uint256,uint8)" --rpc-url $RPC

# Ver si un handle está registrado
cast call $CONTRACT "isRegistered(string)(bool)" "@happy_hasbulla_" --rpc-url $RPC

# Ver score de un handle
cast call $CONTRACT "scoresByHandle(string)(uint256)" "@happy_hasbulla_" --rpc-url $RPC
```

### Logs en Consola del Navegador

Abre DevTools (F12) → Console para ver:
- Llamadas a APIs
- Respuestas de ZK proofs
- Transacciones enviadas
- Errores detallados

---

## 🔧 Configuración

### Variables de Entorno (.env)

```bash
# Contrato desplegado
NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=0xab76c932f811f30c96eb48a2c873fefc9e98f2d3

# URLs de APIs
REGISTRATION_URL=https://gist.githubusercontent.com/dpinones/f2598e12d87a44584391ae9c69d5b5f5/raw/a6cd14643007652edc45fe698779d7788c0e7b13/register_user.json
SUBMISSION_URL=https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json

# QUERIES_HASH (calculados automáticamente)
REGISTRATION_QUERIES_HASH=0x18a43ad3cc574a0be53e2fb789556333e5d82db2b223c62d9edb401d9b791346
SUBMISSION_QUERIES_HASH=0x344f137f98b9555161309d97e4535ad0522f9ec4836fdbcceeafc8d777991b3a

# WETH en Sepolia
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
```

### Datos Fijos

```javascript
CAMPAIGN_ID = "cmp_001"  // Hardcoded en el contrato
EXPECTED_HANDLE = "@happy_hasbulla_"  // Ejemplo en el UI
```

---

## 🐛 Troubleshooting

### Error: "Invalid queries hash"

**Causa**: Las queries extraídas no coinciden con el QUERIES_HASH del contrato.

**Solución**:
1. Verifica que las URLs en `.env` sean correctas
2. Verifica que los QUERIES_HASH coincidan con el contrato
3. Re-calcula los hashes: `./calculate-queries-hashes.sh`

### Error: "ZK proof verification failed"

**Causa**: El ZK proof no es válido o no coincide con el journal.

**Solución**:
1. Intenta generar el proof nuevamente
2. Verifica que el IMAGE_ID del contrato sea correcto
3. Revisa los logs de `/api/compress` para ver errores

### Error: "Invalid state"

**Causa**: Intentas hacer una acción en el estado incorrecto.

**Solución**:
- Registration solo en estado 0
- Submit Proof solo en estado 1
- Claim solo en estado 2
- Usa el botón "Advance State" para cambiar

### Error: "Already registered/submitted/claimed"

**Causa**: Ya completaste esa acción.

**Solución**:
- Usa otro handle o wallet
- Verifica el estado on-chain

### UI no carga

**Solución**:
```bash
# Reinicia el servidor
lsof -ti:3000 | xargs kill -9
npm run dev
```

### MetaMask no se conecta

**Solución**:
1. Cambia a Sepolia network
2. Recarga la página
3. Click en "Connect Wallet" nuevamente

---

## 📝 Notas Importantes

### Tiempos de Espera

- Generación de ZK proof: **30-60 segundos**
- Confirmación de TX: **5-15 segundos** en Sepolia
- No cerrar la pestaña durante la generación del proof

### Costos de Gas

- Register: ~150k gas
- Submit: ~120k gas
- Claim: ~80k gas
- Advance State: ~45k gas

En Sepolia (testnet) el gas es gratis, solo necesitas Sepolia ETH.

### Limitaciones

- Campaign ID fijo: "cmp_001"
- URLs fijas en el contrato (no modificables post-deploy)
- Score range: 1-100 (validado por contrato)
- WETH debe estar previamente depositado en el contrato

### Seguridad

- Solo el deployer puede avanzar estados (en teoría, cualquiera puede pero tiene sentido que sea el admin)
- Los ZK proofs garantizan que los datos vienen de las APIs reales
- No se puede reclamar dos veces
- No se puede enviar proof sin registro previo

---

## ✅ Checklist de Testing

- [ ] Wallet conectada a Sepolia
- [ ] Sepolia ETH disponible para gas
- [ ] Servidor Next.js corriendo en localhost:3000
- [ ] Estado del contrato = Registration (0)
- [ ] Handle de TikTok ingresado
- [ ] Registro exitoso (TX confirmada)
- [ ] Estado avanzado a WaitingForProofs (1)
- [ ] Prueba de participación enviada (TX confirmada)
- [ ] Score visible en UI
- [ ] Estado avanzado a Claimable (2)
- [ ] Recompensa calculada y visible
- [ ] Claim exitoso (WETH recibido)

---

## 🚀 Próximos Pasos (Opcional)

1. **Agregar más handles de prueba** en los Gists
2. **Deploy a producción** (mainnet o L2)
3. **Agregar roles de admin** en el contrato
4. **Sistema de temporización automática** para estados
5. **Dashboard de analytics** para ver todas las participaciones
6. **Integración con TikTok API real** (requiere OAuth)

---

## 📚 Referencias

- **Contrato verificado**: https://sepolia.etherscan.io/address/0xab76c932f811f30c96eb48a2c873fefc9e98f2d3#code
- **vlayer Docs**: https://docs.vlayer.xyz
- **RISC Zero Docs**: https://dev.risczero.com
- **Wagmi Docs**: https://wagmi.sh
- **Viem Docs**: https://viem.sh

---

**🎉 ¡El frontend V2 está completo y funcional!**

Cualquier duda o problema, revisa los logs en la consola del navegador y en la terminal del servidor Next.js.
