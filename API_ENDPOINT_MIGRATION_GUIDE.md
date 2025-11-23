# 🔄 Guía de Migración de API Endpoint

Esta guía te permite cambiar el endpoint de la API, los parámetros públicos y el cuerpo del response de forma rápida y sistemática.

---

## 📋 Checklist de Migración

Cuando cambies el endpoint de la API, debes actualizar estos archivos **en este orden**:

### ✅ Paso 1: Definir el Nuevo Schema de Datos

**Archivo**: Documentación temporal (no código aún)

Define tu nuevo JSON response:

```json
{
  "campo_1": "valor",
  "campo_2": 123,
  "campo_3": "otro_valor"
}
```

**Identifica**:
- ¿Qué campos son públicos (van al journal)?
- ¿Qué campos son strings vs números?
- ¿Qué validaciones necesitas (rangos, formato)?

---

### ✅ Paso 2: Actualizar la API Route (Prove)

**Archivo**: [`app/api/prove/route.ts`](app/api/prove/route.ts)

**Cambios necesarios**:

```typescript
// 1. Actualizar la URL del endpoint
const apiUrl = 'https://tu-nueva-api.com/endpoint';

// 2. Actualizar el método HTTP (GET/POST)
const requestBody = {
  url: apiUrl,
  method: 'GET',  // o 'POST'
  headers: [
    'User-Agent: tu-user-agent',
    'Accept: application/json',
    // Agregar más headers si son necesarios
  ]
};

// Si es POST, agregar body:
// body: JSON.stringify({ param1: 'value1' })
```

**Ejemplo concreto** - De GitHub a TikTok:
```diff
- const githubGraphqlUrl = 'https://api.github.com/graphql';
+ const tiktokApiUrl = 'https://gist.githubusercontent.com/.../mockTikTokVideosResponse.json';

- method: 'POST',
+ method: 'GET',

- headers: ['Authorization: Bearer ...', 'Content-Type: application/json'],
+ headers: ['User-Agent: zk-tiktok-campaign-verifier', 'Accept: application/json'],
```

---

### ✅ Paso 3: Actualizar JMESPath Queries (Compress)

**Archivo**: [`app/api/compress/route.ts`](app/api/compress/route.ts)

**Cambios necesarios**:

```typescript
// Define los campos que quieres extraer del response
const extractConfig = {
  "response.body": {
    "jmespath": [
      `campo_1`,        // Nombre exacto del campo en el JSON
      `campo_2`,        // Puedes usar JMESPath queries complejas
      `campo_3.nested`, // Para campos anidados
    ]
  }
};
```

**Ejemplo concreto** - De GitHub a TikTok:
```diff
- "jmespath": [
-   `data.repository.nameWithOwner`,
-   `data.user.login`,
-   `data.mergedPRs.issueCount`
- ]
+ "jmespath": [
+   `campaign_id`,
+   `handle_tiktok`,
+   `score_calidad`,
+   `url_video`
+ ]
```

**⚠️ IMPORTANTE**: El orden de estos campos determinará el `QUERIES_HASH`. No cambies el orden una vez que tengas el hash.

---

### ✅ Paso 4: Actualizar Tipos TypeScript

**Archivo**: [`app/lib/types.ts`](app/lib/types.ts)

**Cambios necesarios**:

```typescript
// 1. Crear nuevo tipo para tus datos
export type TuNuevoDato = {
  campo1: string;
  campo2: number;
  campo3: string;
};

// 2. Actualizar ZKProofNormalized
export type ZKProofNormalized = {
  zkProof: `0x${string}`;
  journalDataAbi: `0x${string}`;
  tuNuevoDato: TuNuevoDato;  // Reemplazar campaignData
};
```

**Ejemplo concreto**:
```diff
- export type ContributionData = {
-   repo: string;
-   username: string;
-   contributions: number;
- };
+ export type CampaignData = {
+   campaignId: string;
+   handleTiktok: string;
+   scoreCalidad: number;
+   urlVideo: string;
+ };
```

---

### ✅ Paso 5: Actualizar Decodificador de Journal Data

**Archivo**: [`app/lib/utils.ts`](app/lib/utils.ts)

**Cambios necesarios**:

El journal data SIEMPRE tiene estos primeros 5 campos (de vlayer):
1. `bytes32 notaryKeyFingerprint`
2. `string method`
3. `string url`
4. `uint256 timestamp`
5. `bytes32 queriesHash`

Después van **tus campos personalizados** en el mismo orden que definiste en JMESPath:

```typescript
export function decodeJournalData(journalDataAbi: Hex) {
  const decoded = decodeAbiParameters(
    [
      // ⚠️ NO CAMBIES ESTOS 5 - Son de vlayer
      { type: "bytes32", name: "notaryKeyFingerprint" },
      { type: "string", name: "method" },
      { type: "string", name: "url" },
      { type: "uint256", name: "timestamp" },
      { type: "bytes32", name: "queriesHash" },

      // ✅ CAMBIA ESTOS - Tus campos personalizados
      { type: "string", name: "campo1" },     // Debe coincidir con JMESPath[0]
      { type: "uint256", name: "campo2" },    // Debe coincidir con JMESPath[1]
      { type: "string", name: "campo3" },     // Debe coincidir con JMESPath[2]
    ],
    journalDataAbi
  );

  return {
    // vlayer fields
    notaryKeyFingerprint: decoded[0] as Hex,
    method: decoded[1] as string,
    url: decoded[2] as string,
    timestamp: Number(decoded[3]),
    queriesHash: decoded[4] as Hex,

    // Tus campos (índices continúan desde 5)
    campo1: decoded[5] as string,
    campo2: decoded[6] as bigint,  // uint256 => bigint
    campo3: decoded[7] as string,
  };
}
```

**⚠️ Tipos de Solidity → TypeScript**:
- `string` → `as string`
- `uint256` → `as bigint` (luego convierte con `Number()` si es necesario)
- `bytes32` → `as Hex`
- `address` → `as \`0x${string}\``
- `bool` → `as boolean`

**Ejemplo concreto**:
```diff
  { type: "bytes32", name: "queriesHash" },
- { type: "string", name: "repo" },
- { type: "string", name: "username" },
- { type: "uint256", name: "contributions" },
+ { type: "string", name: "campaignId" },
+ { type: "string", name: "handleTiktok" },
+ { type: "uint256", name: "scoreCalidad" },
+ { type: "string", name: "urlVideo" },
```

---

### ✅ Paso 6: Actualizar Hook de Frontend

**Archivo**: [`app/hooks/useProveFlow.ts`](app/hooks/useProveFlow.ts)

**Cambios necesarios**:

```typescript
// 1. Actualizar estados si es necesario
const [tuCampo, setTuCampo] = useState('valor_inicial');

// 2. En handleCompress, actualizar la extracción de datos
const decoded = decodeJournalData(journalDataAbi as `0x${string}`);
const tuNuevoDato = {
  campo1: decoded.campo1,
  campo2: Number(decoded.campo2),  // bigint → number
  campo3: decoded.campo3
};

setZkProofResult({
  zkProof: zkProof as `0x${string}`,
  journalDataAbi: journalDataAbi as `0x${string}`,
  tuNuevoDato  // Reemplazar campaignData
});
```

---

### ✅ Paso 7: Generar QUERIES_HASH

**CRÍTICO**: Antes de tocar el contrato, necesitas el `QUERIES_HASH` correcto.

```bash
# 1. Inicia el servidor
npm run dev

# 2. Genera un proof (esto puede tardar ~30 segundos)
curl -X POST http://localhost:3000/api/prove \
  -H "Content-Type: application/json" \
  -d '{}' > /tmp/presentation.json

# 3. Comprime el proof
curl -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/presentation.json),\"handleTiktok\":\"@test_user\"}" \
  > /tmp/compressed.json

# 4. Extrae el QUERIES_HASH
node -e "
const { decodeAbiParameters } = require('viem');
const data = require('/tmp/compressed.json');
const journalDataAbi = data.success ? data.data.journalDataAbi : data.journalDataAbi;

const decoded = decodeAbiParameters(
  [
    { type: 'bytes32', name: 'notaryKeyFingerprint' },
    { type: 'string', name: 'method' },
    { type: 'string', name: 'url' },
    { type: 'uint256', name: 'timestamp' },
    { type: 'bytes32', name: 'queriesHash' },
    // Agregar tus campos aquí...
  ],
  journalDataAbi
);

console.log('QUERIES_HASH:', decoded[4]);
"
```

**Guarda el QUERIES_HASH** que te devuelva. Lo necesitas en el siguiente paso.

---

### ✅ Paso 8: Crear Nuevo Contrato Solidity

**Archivo**: `contracts/src/TuNuevoContrato.sol`

**Cambios necesarios**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRiscZeroVerifier} from "risc0-ethereum/contracts/src/IRiscZeroVerifier.sol";

contract TuNuevoContrato {
    IRiscZeroVerifier public immutable VERIFIER;
    bytes32 public immutable IMAGE_ID;
    bytes32 public immutable EXPECTED_NOTARY_KEY_FINGERPRINT;
    bytes32 public immutable EXPECTED_QUERIES_HASH;
    string public expectedUrlPattern;

    // 1. Define tu storage mapping
    mapping(string => TuEstructura) public tuMapping;

    // 2. Define tu estructura si es necesaria
    struct TuEstructura {
        uint256 campo1;
        string campo2;
        // ...
    }

    // 3. Define tu evento
    event TuEvento(
        string indexed campo1,
        uint256 campo2,
        uint256 timestamp
    );

    // 4. Define errores custom
    error InvalidCampo1();
    error InvalidCampo2();

    constructor(
        address _verifier,
        bytes32 _imageId,
        bytes32 _expectedNotaryKeyFingerprint,
        bytes32 _expectedQueriesHash,
        string memory _expectedUrlPattern
    ) {
        VERIFIER = IRiscZeroVerifier(_verifier);
        IMAGE_ID = _imageId;
        EXPECTED_NOTARY_KEY_FINGERPRINT = _expectedNotaryKeyFingerprint;
        EXPECTED_QUERIES_HASH = _expectedQueriesHash;
        expectedUrlPattern = _expectedUrlPattern;
    }

    // 5. Función principal de submit
    function submitTuDato(
        bytes calldata journalData,
        bytes calldata seal
    ) external {
        // Decode journal data (MISMO ORDEN QUE EN TypeScript)
        (
            bytes32 notaryKeyFingerprint,
            string memory method,
            string memory url,
            uint256 timestamp,
            bytes32 queriesHash,
            string memory campo1,      // Tus campos
            uint256 campo2,
            string memory campo3
        ) = abi.decode(journalData, (bytes32, string, string, uint256, bytes32, string, uint256, string));

        // Validaciones
        if (notaryKeyFingerprint != EXPECTED_NOTARY_KEY_FINGERPRINT) {
            revert InvalidNotaryKeyFingerprint();
        }
        if (queriesHash != EXPECTED_QUERIES_HASH) {
            revert InvalidQueriesHash();
        }
        // Agregar más validaciones según tu lógica de negocio

        // Verificar ZK proof
        bytes memory journalDataBytes = abi.encode(
            notaryKeyFingerprint, method, url, timestamp, queriesHash,
            campo1, campo2, campo3
        );
        VERIFIER.verify(seal, IMAGE_ID, sha256(journalDataBytes));

        // Guardar datos
        tuMapping[campo1] = TuEstructura({
            campo1: campo2,
            campo2: campo3
        });

        // Emitir evento
        emit TuEvento(campo1, campo2, timestamp);
    }
}
```

**⚠️ ORDEN CRÍTICO**: Los campos en `abi.decode()` deben estar en el **MISMO ORDEN** que:
1. Tu `decodeJournalData()` en TypeScript
2. Tus queries JMESPath en compress route
3. Tu `abi.encode()` más abajo en el mismo contrato

---

### ✅ Paso 9: Actualizar Script de Deploy

**Archivo**: [`contracts/scripts/deploy.ts`](contracts/scripts/deploy.ts)

**Cambios necesarios**:

```typescript
// 1. Actualizar el path del artifact
function loadContractArtifact() {
  const artifactPath = path.join(__dirname, '../out/TuNuevoContrato.sol/TuNuevoContrato.json');
  // ...
}

// 2. La URL por defecto (línea ~133)
const expectedUrl = process.env.EXPECTED_URL || 'https://tu-api.com/endpoint';
```

---

### ✅ Paso 10: Actualizar Variables de Entorno

**Archivo**: [`.env`](.env)

```bash
# Actualizar estas 2 variables
QUERIES_HASH=0x<el_hash_que_calculaste_en_paso_7>
EXPECTED_URL=https://tu-nueva-api.com/endpoint

# El resto permanece igual (no cambiar)
NOTARY_KEY_FINGERPRINT=0xa7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af
ZK_PROVER_GUEST_ID=0x6a555e28e0d59c20ad0dc76dfa07328f2f68638827dafef87178b306fb02e608
```

---

### ✅ Paso 11: Compilar y Desplegar

```bash
# 1. Compilar contrato
cd contracts
forge build

# 2. Desplegar a Sepolia
source ../.env
export QUERIES_HASH="$QUERIES_HASH"
export EXPECTED_URL="$EXPECTED_URL"
export NOTARY_KEY_FINGERPRINT="$NOTARY_KEY_FINGERPRINT"
export ZK_PROVER_GUEST_ID="$ZK_PROVER_GUEST_ID"

npm run deploy sepolia

# 3. Copiar la dirección del contrato desplegado
# Actualizar .env:
# NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=0x...
```

---

### ✅ Paso 12: Actualizar ABI del Frontend

**Archivo**: [`app/lib/abi.ts`](app/lib/abi.ts)

```typescript
// Copia el ABI desde contracts/out/TuNuevoContrato.sol/TuNuevoContrato.json
export const TuNuevoContratoAbi = [
  {
    type: "function",
    name: "submitTuDato",  // Actualizar nombre
    inputs: [
      { name: "journalData", type: "bytes" },
      { name: "seal", type: "bytes" }
    ]
  },
  // ... resto del ABI
] as const;
```

---

### ✅ Paso 13: Actualizar useOnChainVerification

**Archivo**: [`app/hooks/useOnChainVerification.ts`](app/hooks/useOnChainVerification.ts)

```typescript
// Línea ~95: Actualizar el nombre de la función
functionName: 'submitTuDato',  // Cambiar de 'submitCampaign'
```

---

## 🧪 Checklist de Pruebas

Después de completar todos los pasos, verifica:

```bash
# 1. Verificar parámetros del contrato
cast call <CONTRACT_ADDRESS> "EXPECTED_QUERIES_HASH()(bytes32)" --rpc-url <RPC_URL>
cast call <CONTRACT_ADDRESS> "expectedUrlPattern()(string)" --rpc-url <RPC_URL>

# 2. Generar proof desde el frontend
npm run dev
# Ir a http://localhost:3000
# Click en "Generate ZK Proof"
# Click en "Compress & Extract Data"

# 3. Enviar transacción
# Conectar wallet
# Click en "Submit On-Chain"

# 4. Verificar datos almacenados
cast call <CONTRACT_ADDRESS> "tuFuncionGetter(string)(uint256)" "tu_clave" --rpc-url <RPC_URL>
```

---

## 🎯 Orden de Ejecución Recomendado

1. ✅ Definir schema de datos (5 min)
2. ✅ Actualizar API route prove (5 min)
3. ✅ Actualizar API route compress con JMESPath (10 min)
4. ✅ Actualizar tipos TypeScript (5 min)
5. ✅ Actualizar utils decodeJournalData (10 min)
6. ✅ Actualizar useProveFlow (5 min)
7. ✅ **Generar QUERIES_HASH** (10-30 min) ← CRÍTICO
8. ✅ Crear contrato Solidity (20 min)
9. ✅ Actualizar script deploy (5 min)
10. ✅ Actualizar .env (2 min)
11. ✅ Compilar y desplegar (5 min)
12. ✅ Actualizar ABI frontend (5 min)
13. ✅ Actualizar useOnChainVerification (2 min)
14. ✅ Probar end-to-end (10 min)

**Total estimado**: 90-110 minutos

---

## ⚠️ Errores Comunes

### Error 1: "InvalidQueriesHash"
**Causa**: El QUERIES_HASH del contrato no coincide con el del proof
**Solución**: Volver al Paso 7 y recalcular el hash

### Error 2: "Failed to decode journalDataAbi"
**Causa**: El orden de campos en `decodeAbiParameters` no coincide con el orden real
**Solución**: Verificar que el orden en compress route, utils y contrato sea idéntico

### Error 3: Transaction reverts sin mensaje
**Causa**: ZK proof verification failed
**Solución**: Verificar que IMAGE_ID, NOTARY_KEY_FINGERPRINT y EXPECTED_URL sean correctos

### Error 4: "Cannot find module"
**Causa**: No reiniciaste el servidor Next.js después de cambiar código
**Solución**: Matar y reiniciar `npm run dev`

---

## 📚 Referencia Rápida

### JMESPath Query Examples

```typescript
// Campo simple
"campo"

// Campo anidado
"objeto.campo"

// Array - primer elemento
"array[0]"

// Array - todos los elementos
"array[*]"

// Filtrar array
"array[?type=='foo'].name"

// Combinar campos
"join(', ', array[*].name)"
```

### Tipos Solidity ↔ TypeScript

| Solidity | TypeScript | Conversión |
|----------|-----------|------------|
| `string` | `string` | `as string` |
| `uint256` | `bigint` | `as bigint`, luego `Number()` |
| `bytes32` | `Hex` | `as Hex` |
| `address` | `` `0x${string}` `` | `` as `0x${string}` `` |
| `bool` | `boolean` | `as boolean` |
| `bytes` | `Hex` | `as Hex` |

---

## 🚀 Siguientes Migraciones

Para tu próxima migración de API:

1. Copia este archivo
2. Sigue los 13 pasos en orden
3. Documenta cualquier cambio específico que hayas hecho
4. Actualiza este archivo si encuentras mejores prácticas

---

## ✅ Checklist Final

Antes de considerar la migración completa:

- [ ] El QUERIES_HASH es correcto y está en .env
- [ ] El contrato se compila sin errores
- [ ] El contrato está desplegado en testnet
- [ ] Los parámetros del contrato en chain son correctos
- [ ] El frontend genera proofs correctamente
- [ ] El frontend comprime proofs correctamente
- [ ] Las transacciones on-chain son exitosas
- [ ] Los datos se almacenan correctamente en el contrato
- [ ] El contrato está verificado en Etherscan (opcional pero recomendado)

---

¿Listo para tu siguiente migración? ¡Sigue estos pasos y estarás funcionando en ~2 horas! 🎉
