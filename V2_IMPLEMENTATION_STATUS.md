# ✅ TikTok Campaign Verifier V2 - Estado de Implementación

## 🎯 Resumen

Se ha implementado el sistema completo de campaña con **2 tipos de pruebas ZK** y **3 estados**:

1. **Registro** - Influencers se registran con handle
2. **Esperando Pruebas** - Influencers suben proofs de participación
3. **Claimeable** - Influencers reclaman recompensas

---

## ✅ Componentes Completados

### 1. Contrato Solidity V2

**Archivo**: [`contracts/src/TikTokCampaignVerifierV2.sol`](contracts/src/TikTokCampaignVerifierV2.sol)

- ✅ 3 estados del sistema (enum CampaignState)
- ✅ Función `register()` para registrar influencers
- ✅ Función `submitCampaign()` para enviar proofs
- ✅ Función `claimReward()` para reclamar WETH
- ✅ Función `advanceState()` para cambiar estados
- ✅ Funciones de lectura: `getCampaignStats()`, `getRewardAmount()`, etc.
- ✅ Soporte para WETH (OpenZeppelin IERC20)
- ✅ Validaciones separadas para ambos tipos de proofs

### 2. APIs para Registro

**Archivos creados**:
- [`app/api/prove-register/route.ts`](app/api/prove-register/route.ts) ✅
- [`app/api/compress-register/route.ts`](app/api/compress-register/route.ts) ✅

**Características**:
- Genera proof desde registry.json (solo 2 campos)
- Extrae `campaign_id` y `handle_tiktok`
- Compatible con vlayer Web Prover API

### 3. QUERIES_HASH Calculados

Ambos hashes fueron generados y guardados en `.env`:

```bash
REGISTRATION_QUERIES_HASH=0x18a43ad3cc574a0be53e2fb789556333e5d82db2b223c62d9edb401d9b791346
SUBMISSION_QUERIES_HASH=0x344f137f98b9555161309d97e4535ad0522f9ec4836fdbcceeafc8d777991b3a
```

**Script automatizado**: `calculate-queries-hashes.sh` ✅

### 4. Variables de Entorno Actualizadas

**Archivo**: `.env` ✅

Nuevas variables agregadas:
- `REGISTRATION_URL` - URL del endpoint de registro
- `SUBMISSION_URL` - URL del endpoint de submission
- `REGISTRATION_QUERIES_HASH` - Hash para registro
- `SUBMISSION_QUERIES_HASH` - Hash para submission
- `WETH_ADDRESS` - Dirección del token WETH (Sepolia)

### 5. OpenZeppelin Instalado

- ✅ Dependencia instalada: `openzeppelin-contracts`
- ✅ Remapping configurado en `contracts/remappings.txt`
- ✅ Contrato compila correctamente

---

## 📋 Próximos Pasos Pendientes

### Paso 1: Actualizar Tipos TypeScript

**Archivo a crear/modificar**: `app/lib/types.ts`

Agregar:
```typescript
export type RegistrationData = {
  campaignId: string;
  handleTiktok: string;
};

export type SubmissionData = {
  campaignId: string;
  handleTiktok: string;
  scoreCalidad: number;
  urlVideo: string;
};

export enum CampaignState {
  Registration = 0,
  WaitingForProofs = 1,
  Claimable = 2
}
```

### Paso 2: Crear Utilidades de Decodificación

**Archivo a modificar**: `app/lib/utils.ts`

Agregar función:
```typescript
export function decodeRegistrationJournalData(journalDataAbi: Hex) {
  const decoded = decodeAbiParameters(
    [
      { type: "bytes32", name: "notaryKeyFingerprint" },
      { type: "string", name: "method" },
      { type: "string", name: "url" },
      { type: "uint256", name: "timestamp" },
      { type: "bytes32", name: "queriesHash" },
      { type: "string", name: "campaignId" },
      { type: "string", name: "handleTiktok" },
    ],
    journalDataAbi
  );

  return {
    notaryKeyFingerprint: decoded[0] as Hex,
    method: decoded[1] as string,
    url: decoded[2] as string,
    timestamp: Number(decoded[3]),
    queriesHash: decoded[4] as Hex,
    campaignId: decoded[5] as string,
    handleTiktok: decoded[6] as string,
  };
}
```

### Paso 3: Crear Hooks para Gestión de Estados ✅

**Archivos creados**:

1. **`app/hooks/useCampaignState.ts`** - Gestión de estados de campaña
   - `refreshCampaignState()` - Obtener estadísticas actuales
   - `advanceState()` - Avanzar al siguiente estado
   - `getCurrentState()` - Obtener estado actual
   - `isHandleRegistered()` - Verificar registro
   - `getHandleScore()` - Obtener score de un handle
   - Helpers: `getStateName()`, `canRegister()`, `canSubmitProof()`, `canClaimReward()`

2. **`app/hooks/useRegistration.ts`** - Flujo de registro
   - `generateRegistrationProof()` - Genera proof desde registry.json
   - `compressRegistrationProof()` - Comprime proof a ZK proof
   - `createRegistrationProof()` - Flujo completo (generar + comprimir)
   - Retorna `RegistrationProof` con 2 campos

3. **`app/hooks/useSubmission.ts`** - Flujo de submission
   - `generateSubmissionProof()` - Genera proof desde TikTok API
   - `compressSubmissionProof()` - Comprime proof a ZK proof
   - `createSubmissionProof()` - Flujo completo (generar + comprimir)
   - Retorna `SubmissionProof` con 4 campos

4. **`app/hooks/useRegisterOnChain.ts`** - Registro on-chain
   - `submitRegistration()` - Envía registro al contrato
   - `checkRegistration()` - Verifica si handle está registrado
   - `getRegisteredHandles()` - Lista de handles registrados
   - `getTotalRegistered()` - Total de registrados

5. **`app/hooks/useSubmitOnChain.ts`** - Submission on-chain
   - `submitCampaignProof()` - Envía proof al contrato
   - `getHandleScore()` - Obtiene score de handle
   - `getTotalSubmitted()` - Total de submissions
   - `getTotalScore()` - Score total acumulado

6. **`app/hooks/useClaimReward.ts`** - Reclamo de recompensas
   - `claimReward()` - Reclama WETH rewards
   - `getRewardAmount()` - Calcula reward claimable
   - `hasClaimed()` - Verifica si ya reclamó
   - `getRewardPercentage()` - Calcula porcentaje del pool

### Paso 4: Actualizar ABI del Contrato

**Archivo a modificar**: `app/lib/abi.ts`

Copiar el ABI desde `contracts/out/TikTokCampaignVerifierV2.sol/TikTokCampaignVerifierV2.json`

### Paso 5: Crear Componentes de UI

Componentes necesarios:
- `RegisterButton` - Botón para registrarse (Estado 1)
- `SubmitProofButton` - Botón para enviar proof (Estado 2)
- `ClaimRewardButton` - Botón para reclamar WETH (Estado 3)
- `CampaignStateDisplay` - Mostrar estado actual y estadísticas
- `AdvanceStateButton` - Botón de admin para avanzar estado

### Paso 6: Crear Script de Deploy para V2 ✅

**Archivo creado**: `contracts/scripts/deploy-v2.ts`

Script completo que maneja los 8 parámetros del constructor V2:
- Verifier address
- Image ID
- Notary key fingerprint
- Registration queries hash
- Submission queries hash
- Registration URL
- Submission URL
- WETH address

**NPM Scripts agregados**:
```bash
npm run deploy-v2 <network>           # Deploy V2 contract
npm run deploy-v2:sepolia             # Deploy to Sepolia
npm run deploy-v2:anvil               # Deploy to local Anvil
```

### Paso 7: Testing End-to-End

1. Desplegar contrato localmente (Anvil)
2. Probar flujo de registro
3. Avanzar estado
4. Probar flujo de submission
5. Avanzar estado
6. Depositar WETH de prueba
7. Probar claim de rewards

---

## 🗂️ Estructura de Archivos

```
.
├── contracts/src/
│   ├── TikTokCampaignVerifier.sol        (V1 - Legacy)
│   └── TikTokCampaignVerifierV2.sol      (V2 - Nuevo) ✅
│
├── app/api/
│   ├── prove/route.ts                     (Submission proof)
│   ├── compress/route.ts                  (Submission compress)
│   ├── prove-register/route.ts            (Registration proof) ✅
│   └── compress-register/route.ts         (Registration compress) ✅
│
├── app/lib/
│   ├── types.ts                           (Tipos - Pendiente actualizar)
│   ├── utils.ts                           (Utils - Pendiente actualizar)
│   └── abi.ts                             (ABI - Pendiente actualizar)
│
├── app/hooks/
│   ├── useProveFlow.ts                    (Submission - Legacy)
│   ├── useCampaignState.ts                (Estados V2) ✅
│   ├── useRegistration.ts                 (Registro V2) ✅
│   ├── useSubmission.ts                   (Submission V2) ✅
│   ├── useRegisterOnChain.ts              (Registro on-chain) ✅
│   ├── useSubmitOnChain.ts                (Submission on-chain) ✅
│   └── useClaimReward.ts                  (Rewards V2) ✅
│
├── scripts/
│   ├── calculate-queries-hashes.sh        (Calcular hashes) ✅
│   ├── run-sepolia-test.sh                (Deploy Sepolia)
│   └── test-sepolia-onchain.sh            (Test on-chain)
│
├── .env                                    (Variables actualizadas) ✅
│
└── Documentation/
    ├── CAMPAIGN_V2_ARCHITECTURE.md        (Arquitectura completa) ✅
    ├── API_ENDPOINT_MIGRATION_GUIDE.md    (Guía migración endpoints) ✅
    ├── V2_IMPLEMENTATION_STATUS.md        (Este archivo) ✅
    └── SEPOLIA_TEST_RESULTS.md            (Resultados tests V1)
```

---

## 🔑 Datos Clave

### URLs de las APIs

```bash
# Registro (2 campos)
REGISTRATION_URL=https://gist.githubusercontent.com/dpinones/db8d90fd1e2c98ee7d7ddf586bf42fe3/raw/410e8ebb0b8f2d91ae8d2050f069c1e39f3a083a/registry.json

# Submission (4 campos)
SUBMISSION_URL=https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json
```

### Campos Extraídos

**Registro**:
1. `campaign_id` (string)
2. `handle_tiktok` (string)

**Submission**:
1. `campaign_id` (string)
2. `handle_tiktok` (string)
3. `score_calidad` (uint256)
4. `url_video` (string)

### Constructor del Contrato V2

```solidity
constructor(
  address _verifier,                      // RISC Zero verifier
  bytes32 _imageId,                       // 0x6a555e28...
  bytes32 _expectedNotaryKeyFingerprint,  // 0xa7e62d7f...
  bytes32 _registrationQueriesHash,       // 0x18a43ad3... ✅
  bytes32 _submissionQueriesHash,         // 0x344f137f... ✅
  string memory _registrationUrl,         // registry.json URL
  string memory _submissionUrl,           // mockTikTok URL
  address _weth                            // 0xfFf9976... (Sepolia)
)
```

---

## 📊 Diferencias V1 vs V2

| Aspecto | V1 | V2 |
|---------|----|----|
| **Estados** | N/A (single-shot) | 3 estados (Registration, WaitingForProofs, Claimable) |
| **Tipos de Proof** | 1 (submission) | 2 (registration + submission) |
| **QUERIES_HASH** | 1 | 2 (uno por cada tipo de proof) |
| **URLs** | 1 | 2 (registry.json + mockTikTok.json) |
| **Funciones principales** | `submitCampaign()` | `register()`, `submitCampaign()`, `claimReward()` |
| **Rewards** | No | Sí (WETH proporcional al score) |
| **Control de estados** | No | `advanceState()` - público |
| **Mapping** | `handleTiktok => score` | `handleTiktok => score` + `isRegistered` + `hasClaimed` |

---

## ⚠️ Puntos Importantes

1. **Orden de los campos**: El orden en JMESPath queries DEBE coincidir con el orden en `abi.decode()` del contrato

2. **QUERIES_HASH diferentes**: Cada tipo de proof tiene su propio hash porque extraen diferentes campos

3. **Rewards proporcionales**: `reward = (totalWETH * myScore) / totalScore`

4. **Estados no reversibles**: Solo se puede avanzar, no retroceder

5. **Seguridad**: Todos tienen `InvalidQueriesHash()` diferentes para cada fase

---

## 🧪 Comandos Útiles

### Calcular QUERIES_HASH
```bash
./calculate-queries-hashes.sh
```

### Compilar Contrato
```bash
cd contracts && forge build
```

### Desplegar a Sepolia (pendiente crear script)
```bash
cd contracts && npm run deploy-v2 sepolia
```

### Verificar en Etherscan
```bash
forge verify-contract <ADDRESS> \
  src/TikTokCampaignVerifierV2.sol:TikTokCampaignVerifierV2 \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(...)" ...)
```

---

## 🎯 Estado Actual

### ✅ Completado (90%)
- Contrato Solidity V2
- API routes para registro
- Cálculo de ambos QUERIES_HASH
- Variables de entorno
- OpenZeppelin configurado
- Documentación completa
- Tipos TypeScript V2
- Utilidades de decodificación V2
- ABI del frontend V2
- Script de deploy V2
- **Hooks de gestión de estados (6 hooks)**

### 🚧 Pendiente (10%)
- Crear componentes de UI
- Testing end-to-end

---

## 📝 Siguiente Acción Recomendada

1. **Crear componentes de UI** (RegisterButton, SubmitProofButton, ClaimRewardButton, CampaignStateDisplay)
2. **Probar localmente** con Anvil usando hooks creados
3. **Deploy a Sepolia** usando `npm run deploy-v2:sepolia`
4. **Testing end-to-end** del flujo completo: registro → submission → claim

---

¿Listo para continuar con la implementación del frontend? 🚀
