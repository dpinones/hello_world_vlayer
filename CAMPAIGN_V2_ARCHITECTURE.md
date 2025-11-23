# 🎯 TikTok Campaign Verifier V2 - Arquitectura Completa

## 📊 Visión General

Sistema de campaña de TikTok con **3 estados** y **2 tipos de pruebas ZK**:

1. **Registro** → Influencers se registran con su handle
2. **Esperando Pruebas** → Influencers suben su proof de participación
3. **Claimeable** → Influencers reclaman recompensas en WETH

---

## 🔄 Flujo del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      ESTADO 1: REGISTRACION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Influencer → Botón "Registrar"                                │
│       ↓                                                         │
│  Frontend llama a /api/prove                                   │
│       ↓                                                         │
│  API GET: registry.json                                        │
│       {                                                         │
│         "campaign_id": "cmp_001",                              │
│         "handle_tiktok": "@happy_hasbulla_"                    │
│       }                                                         │
│       ↓                                                         │
│  vlayer Web Prover genera ZK proof                            │
│       ↓                                                         │
│  Frontend llama a /api/compress                                │
│       ↓                                                         │
│  Extrae: campaign_id + handle_tiktok                          │
│       ↓                                                         │
│  Frontend → Contract.register(journalData, seal)              │
│       ↓                                                         │
│  ✅ Handle registrado                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                   Cualquiera llama
                   advanceState()
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  ESTADO 2: ESPERANDO PRUEBAS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Influencer → Botón "Subir Proof"                             │
│       ↓                                                         │
│  Frontend llama a /api/prove                                   │
│       ↓                                                         │
│  API GET: mockTikTokVideosResponse.json                       │
│       {                                                         │
│         "campaign_id": "cmp_001",                              │
│         "handle_tiktok": "@happy_hasbulla_",                   │
│         "score_calidad": 15,                                   │
│         "url_video": "https://..."                             │
│       }                                                         │
│       ↓                                                         │
│  vlayer Web Prover genera ZK proof                            │
│       ↓                                                         │
│  Frontend llama a /api/compress                                │
│       ↓                                                         │
│  Extrae: campaign_id + handle + score + url                   │
│       ↓                                                         │
│  Frontend → Contract.submitCampaign(journalData, seal)        │
│       ↓                                                         │
│  ✅ Score almacenado                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                   Cualquiera llama
                   advanceState()
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ESTADO 3: CLAIMEABLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contrato tiene balance de WETH                               │
│       ↓                                                         │
│  Influencer → Botón "Claim Reward"                            │
│       ↓                                                         │
│  Frontend → Contract.claimReward(handleTiktok)                │
│       ↓                                                         │
│  Cálculo: reward = (totalWETH * myScore) / totalScore         │
│       ↓                                                         │
│  ✅ WETH transferido al wallet del influencer                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Cambios en el Contrato

### Nuevo: `TikTokCampaignVerifierV2.sol`

**Constructor requiere 8 parámetros** (vs 5 en V1):

```solidity
constructor(
    address _verifier,                      // RISC Zero verifier
    bytes32 _imageId,                       // ZK program ID
    bytes32 _expectedNotaryKeyFingerprint,  // vlayer notary
    bytes32 _registrationQueriesHash,       // ⭐ NUEVO: Hash para registro
    bytes32 _submissionQueriesHash,         // ⭐ NUEVO: Hash para submission
    string memory _registrationUrl,         // ⭐ NUEVO: URL de registry.json
    string memory _submissionUrl,           // URL de submission
    address _weth                            // ⭐ NUEVO: WETH token
)
```

**3 Funciones Principales**:

1. **`register(journalData, seal)`** - Solo en estado Registration
2. **`submitCampaign(journalData, seal)`** - Solo en estado WaitingForProofs
3. **`claimReward(handleTiktok)`** - Solo en estado Claimable

**Función de Control**:

- **`advanceState()`** - Cualquiera puede llamarla para avanzar el estado

**Funciones de Lectura**:

- `getCampaignStats()` - Estadísticas de la campaña
- `getRewardAmount(handle)` - Ver cuánto WETH puede reclamar
- `getRegisteredHandles()` - Lista de todos los registrados
- `isRegistered[handle]` - Verificar si está registrado
- `scoresByHandle[handle]` - Ver el score
- `hasClaimed[handle]` - Ver si ya reclamó

---

## 📝 Variables de Entorno Necesarias

```bash
# ZK Prover (no cambiar)
ZK_PROVER_GUEST_ID=0x6a555e28e0d59c20ad0dc76dfa07328f2f68638827dafef87178b306fb02e608
NOTARY_KEY_FINGERPRINT=0xa7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af

# URLs de las APIs
REGISTRATION_URL=https://gist.githubusercontent.com/dpinones/db8d90fd1e2c98ee7d7ddf586bf42fe3/raw/410e8ebb0b8f2d91ae8d2050f069c1e39f3a083a/registry.json
SUBMISSION_URL=https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json

# Queries Hashes (⚠️ DEBES CALCULARLOS)
REGISTRATION_QUERIES_HASH=0x0000000000000000000000000000000000000000000000000000000000000000
SUBMISSION_QUERIES_HASH=0x344f137f98b9555161309d97e4535ad0522f9ec4836fdbcceeafc8d777991b3a

# WETH Token Address
# Sepolia WETH: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
# Mainnet WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
```

---

## 🔑 Calcular REGISTRATION_QUERIES_HASH

Necesitas generar el hash para el proof de registro:

### Paso 1: Crear API Route para Registro

**Archivo**: `app/api/prove-register/route.ts`

```typescript
export async function POST(request: Request) {
  const registryUrl = 'https://gist.githubusercontent.com/dpinones/db8d90fd1e2c98ee7d7ddf586bf42fe3/raw/410e8ebb0b8f2d91ae8d2050f069c1e39f3a083a/registry.json';

  const requestBody = {
    url: registryUrl,
    method: 'GET',
    headers: [
      'User-Agent: zk-tiktok-verifier',
      'Accept: application/json'
    ]
  };

  const response = await fetch(webProverApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vlayer-client-id': clientId,
      'x-vlayer-secret': secret,
    },
    body: JSON.stringify(requestBody),
  });

  return Response.json(await response.json());
}
```

### Paso 2: Crear Compress Route para Registro

**Archivo**: `app/api/compress-register/route.ts`

```typescript
export async function POST(request: Request) {
  const { presentation, handleTiktok } = await request.json();

  const extractConfig = {
    "response.body": {
      "jmespath": [
        `campaign_id`,      // Solo 2 campos para registro
        `handle_tiktok`
      ]
    }
  };

  // Llamar a vlayer compress endpoint...
  // (mismo código que compress.ts pero con extractConfig diferente)
}
```

### Paso 3: Generar el Hash

```bash
# 1. Generar proof de registro
curl -X POST http://localhost:3000/api/prove-register \
  -H "Content-Type: application/json" \
  -d '{}' > /tmp/registration-presentation.json

# 2. Comprimir
curl -X POST http://localhost:3000/api/compress-register \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/registration-presentation.json),\"handleTiktok\":\"@test_user\"}" \
  > /tmp/registration-compressed.json

# 3. Extraer QUERIES_HASH
node -e "
const { decodeAbiParameters } = require('viem');
const data = require('/tmp/registration-compressed.json');
const journalDataAbi = data.success ? data.data.journalDataAbi : data.journalDataAbi;

const decoded = decodeAbiParameters(
  [
    { type: 'bytes32', name: 'notaryKeyFingerprint' },
    { type: 'string', name: 'method' },
    { type: 'string', name: 'url' },
    { type: 'uint256', name: 'timestamp' },
    { type: 'bytes32', name: 'queriesHash' },
    { type: 'string', name: 'campaignId' },      // REGISTRO
    { type: 'string', name: 'handleTiktok' },    // REGISTRO
  ],
  journalDataAbi
);

console.log('REGISTRATION_QUERIES_HASH:', decoded[4]);
"
```

**Actualiza `.env`** con el hash obtenido.

---

## 🏗️ Despliegue del Contrato

### Script de Deploy Actualizado

**Archivo**: `contracts/scripts/deploy-v2.ts`

```typescript
// Leer variables de entorno
const registrationQueriesHash = process.env.REGISTRATION_QUERIES_HASH as Hex;
const submissionQueriesHash = process.env.SUBMISSION_QUERIES_HASH as Hex;
const registrationUrl = process.env.REGISTRATION_URL || '';
const submissionUrl = process.env.SUBMISSION_URL || '';
const wethAddress = process.env.WETH_ADDRESS as Hex;

// Desplegar
const hash = await walletClient.deployContract({
  abi,
  bytecode,
  account,
  chain: walletClient.chain,
  args: [
    verifierAddress,
    imageId,
    notaryKeyFingerprint,
    registrationQueriesHash,      // ⭐ NUEVO
    submissionQueriesHash,         // ⭐ NUEVO
    registrationUrl,               // ⭐ NUEVO
    submissionUrl,
    wethAddress                     // ⭐ NUEVO
  ],
});
```

---

## 🎨 Cambios en el Frontend

### 1. Actualizar `app/lib/types.ts`

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

### 2. Crear Hook `useCampaignState.ts`

```typescript
export function useCampaignState() {
  const [state, setState] = useState<CampaignState>(CampaignState.Registration);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [totalSubmitted, setTotalSubmitted] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  // Función para leer el estado del contrato
  async function refreshCampaignState() {
    const stats = await publicClient.readContract({
      address: contractAddress,
      abi: CampaignVerifierAbi,
      functionName: 'getCampaignStats'
    });

    setState(stats[3]);
    setTotalRegistered(Number(stats[0]));
    setTotalSubmitted(Number(stats[1]));
    setTotalScore(Number(stats[2]));
  }

  // Función para avanzar estado
  async function advanceState() {
    const hash = await writeContractAsync({
      address: contractAddress,
      abi: CampaignVerifierAbi,
      functionName: 'advanceState'
    });

    await publicClient.waitForTransactionReceipt({ hash });
    await refreshCampaignState();
  }

  return {
    state,
    totalRegistered,
    totalSubmitted,
    totalScore,
    refreshCampaignState,
    advanceState
  };
}
```

### 3. Actualizar `page.tsx`

```typescript
export default function Home() {
  const {
    state,
    totalRegistered,
    totalSubmitted,
    advanceState
  } = useCampaignState();

  // Mostrar UI diferente según el estado
  return (
    <div>
      {/* Header con estado actual */}
      <CampaignStateDisplay
        state={state}
        registered={totalRegistered}
        submitted={totalSubmitted}
      />

      {/* Botones según estado */}
      {state === CampaignState.Registration && (
        <RegisterButton />
      )}

      {state === CampaignState.WaitingForProofs && (
        <SubmitProofButton />
      )}

      {state === CampaignState.Claimable && (
        <ClaimRewardButton />
      )}

      {/* Botón de admin para avanzar estado */}
      <button onClick={advanceState}>
        Advance to Next State
      </button>
    </div>
  );
}
```

---

## 💰 Sistema de Recompensas

### Cómo Funcionan las Recompensas

1. **Admin deposita WETH** en el contrato:
   ```solidity
   WETH.transfer(contractAddress, amount);
   ```

2. **Cálculo proporcional** por score:
   ```solidity
   reward = (totalWETH * myScore) / totalScore
   ```

3. **Ejemplo**:
   - Total WETH: 100
   - Total Score: 50
   - Mi Score: 15
   - Mi Reward: (100 * 15) / 50 = 30 WETH

### Depositar WETH (Owner/Admin)

```typescript
// Aprobar al contrato
await wethContract.approve(campaignContractAddress, amount);

// Transferir
await wethContract.transfer(campaignContractAddress, amount);
```

### Claim desde Frontend

```typescript
async function claimReward(handleTiktok: string) {
  const hash = await writeContractAsync({
    address: contractAddress,
    abi: CampaignVerifierAbi,
    functionName: 'claimReward',
    args: [handleTiktok]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // ✅ WETH transferido al wallet
}
```

---

## 📊 Diagrama de Estados

```
┌─────────────────┐
│  REGISTRATION   │
│                 │
│ ✓ register()    │
│ ✗ submitCampaign│
│ ✗ claimReward   │
└────────┬────────┘
         │ advanceState()
         ↓
┌─────────────────┐
│ WAITING_PROOFS  │
│                 │
│ ✗ register()    │
│ ✓ submitCampaign│
│ ✗ claimReward   │
└────────┬────────┘
         │ advanceState()
         ↓
┌─────────────────┐
│   CLAIMABLE     │
│                 │
│ ✗ register()    │
│ ✗ submitCampaign│
│ ✓ claimReward   │
└─────────────────┘
```

---

## ⚠️ Validaciones Importantes

### En `register()`:
- ✅ Estado = Registration
- ✅ QUERIES_HASH = REGISTRATION_QUERIES_HASH
- ✅ URL = registrationUrlPattern
- ✅ Handle no vacío
- ✅ No registrado previamente
- ✅ ZK proof válido

### En `submitCampaign()`:
- ✅ Estado = WaitingForProofs
- ✅ QUERIES_HASH = SUBMISSION_QUERIES_HASH
- ✅ URL = submissionUrlPattern
- ✅ Debe estar registrado
- ✅ No haber enviado proof antes
- ✅ Score entre 1-100
- ✅ ZK proof válido

### En `claimReward()`:
- ✅ Estado = Claimable
- ✅ Debe estar registrado
- ✅ Debe tener score > 0
- ✅ No haber reclamado antes
- ✅ Contrato debe tener WETH

---

## 🧪 Flujo de Testing

### 1. Test Local (Anvil)

```bash
# Terminal 1: Anvil
anvil

# Terminal 2: Deploy
cd contracts
REGISTRATION_QUERIES_HASH=0x... \
SUBMISSION_QUERIES_HASH=0x... \
REGISTRATION_URL=https://... \
SUBMISSION_URL=https://... \
WETH_ADDRESS=0x... \
npm run deploy:anvil

# Terminal 3: Frontend
npm run dev

# Testing:
# 1. Register influencer
# 2. advanceState()
# 3. Submit proof
# 4. advanceState()
# 5. Deposit WETH
# 6. Claim reward
```

### 2. Test Sepolia

```bash
# Deploy a Sepolia
npm run deploy:sepolia

# Depositar WETH de prueba
cast send <WETH_ADDRESS> "transfer(address,uint256)" <CONTRACT_ADDRESS> 1000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Probar desde frontend
```

---

## 📋 Checklist de Implementación

- [ ] Calcular REGISTRATION_QUERIES_HASH
- [ ] Calcular SUBMISSION_QUERIES_HASH (ya tienes este)
- [ ] Crear routes: `/api/prove-register` y `/api/compress-register`
- [ ] Actualizar tipos TypeScript
- [ ] Crear hooks: `useCampaignState`, `useRegistration`, `useSubmission`, `useClaimReward`
- [ ] Actualizar UI para mostrar estados
- [ ] Crear componentes: `RegisterButton`, `SubmitProofButton`, `ClaimRewardButton`
- [ ] Actualizar ABI del contrato en frontend
- [ ] Crear script de deploy para V2
- [ ] Probar localmente con Anvil
- [ ] Desplegar a Sepolia
- [ ] Verificar contrato en Etherscan
- [ ] Depositar WETH de prueba
- [ ] Probar flujo completo end-to-end

---

## 🎯 Próximos Pasos

1. **Implementar routes de registro**
2. **Calcular REGISTRATION_QUERIES_HASH**
3. **Actualizar frontend con estados**
4. **Probar localmente**
5. **Desplegar a Sepolia**
6. **Probar con usuarios reales**

---

¿Listo para empezar la implementación? 🚀
