# 🎣 TikTok Campaign Verifier V2 - Hooks Guide

## 📋 Resumen

Se crearon **6 hooks especializados** para manejar el flujo completo del sistema V2:

1. **useCampaignState** - Gestión de estados de campaña
2. **useRegistration** - Generación de proofs de registro
3. **useRegisterOnChain** - Envío de registros on-chain
4. **useSubmission** - Generación de proofs de submission
5. **useSubmitOnChain** - Envío de submissions on-chain
6. **useClaimReward** - Reclamo de recompensas WETH

---

## 1️⃣ useCampaignState

**Archivo**: `app/hooks/useCampaignState.ts`

**Propósito**: Gestionar y monitorear el estado de la campaña.

### Uso:

```typescript
import { useCampaignState, getStateName, canRegister } from '@/hooks/useCampaignState';

function CampaignDashboard() {
  const {
    stats,
    currentState,
    isLoading,
    error,
    refreshCampaignState,
    advanceState,
    isHandleRegistered,
    getHandleScore,
  } = useCampaignState(contractAddress);

  // Auto-refresh stats on mount
  useEffect(() => {
    refreshCampaignState();
  }, []);

  return (
    <div>
      <h2>Estado: {getStateName(currentState)}</h2>
      <p>Registrados: {stats?.registered.toString()}</p>
      <p>Submissions: {stats?.submitted.toString()}</p>
      <p>Score Total: {stats?.totalScore.toString()}</p>

      {canRegister(currentState) && (
        <button onClick={advanceState}>
          Avanzar a WaitingForProofs
        </button>
      )}
    </div>
  );
}
```

### API:

| Función | Descripción | Retorno |
|---------|-------------|---------|
| `refreshCampaignState()` | Actualiza estadísticas desde el contrato | `Promise<void>` |
| `advanceState()` | Avanza al siguiente estado | `Promise<0x${string} \| null>` |
| `getCurrentState()` | Obtiene solo el estado actual | `Promise<CampaignState \| null>` |
| `isHandleRegistered(handle)` | Verifica si handle está registrado | `Promise<boolean>` |
| `getHandleScore(handle)` | Obtiene score de un handle | `Promise<bigint \| null>` |

### Estado:

- `stats` - Objeto con `{ registered, submitted, totalScore, state }`
- `currentState` - Estado actual (0, 1, o 2)
- `isLoading` - Loading state
- `error` - Mensaje de error

### Helpers:

```typescript
getStateName(state)     // "Registration" | "Waiting for Proofs" | "Claimable"
canRegister(state)      // true si state === Registration
canSubmitProof(state)   // true si state === WaitingForProofs
canClaimReward(state)   // true si state === Claimable
```

---

## 2️⃣ useRegistration

**Archivo**: `app/hooks/useRegistration.ts`

**Propósito**: Generar proofs de registro (2 campos: campaignId, handleTiktok).

### Uso:

```typescript
import { useRegistration } from '@/hooks/useRegistration';

function RegisterStep() {
  const {
    isLoading,
    registrationProof,
    error,
    createRegistrationProof,
  } = useRegistration();

  async function handleRegister() {
    const proof = await createRegistrationProof();

    if (proof) {
      console.log('Registration proof ready:', {
        campaignId: proof.registrationData.campaignId,
        handleTiktok: proof.registrationData.handleTiktok,
        zkProof: proof.zkProof,
        journalDataAbi: proof.journalDataAbi,
      });

      // Pasar proof a useRegisterOnChain
    }
  }

  return (
    <button onClick={handleRegister} disabled={isLoading}>
      {isLoading ? 'Generando proof...' : 'Generar Registration Proof'}
    </button>
  );
}
```

### API:

| Función | Descripción | Retorno |
|---------|-------------|---------|
| `generateRegistrationProof()` | Llama a `/api/prove-register` | `Promise<any>` |
| `compressRegistrationProof()` | Llama a `/api/compress-register` | `Promise<RegistrationProof \| null>` |
| `createRegistrationProof()` | Flujo completo (generar + comprimir) | `Promise<RegistrationProof \| null>` |
| `reset()` | Limpia estado | `void` |

### Estado:

- `isProving` - Generando proof
- `isCompressing` - Comprimiendo proof
- `isLoading` - `isProving || isCompressing`
- `presentation` - Web proof sin comprimir
- `registrationProof` - ZK proof final con `{ zkProof, journalDataAbi, registrationData }`
- `error` - Mensaje de error

---

## 3️⃣ useRegisterOnChain

**Archivo**: `app/hooks/useRegisterOnChain.ts`

**Propósito**: Enviar registros al contrato inteligente.

### Uso:

```typescript
import { useRegisterOnChain } from '@/hooks/useRegisterOnChain';
import { useRegistration } from '@/hooks/useRegistration';

function RegisterButton() {
  const { createRegistrationProof } = useRegistration();
  const {
    isRegistering,
    error,
    registerTxHash,
    submitRegistration,
    checkRegistration,
  } = useRegisterOnChain(contractAddress);

  async function handleFullRegistration() {
    // Step 1: Generate proof
    const proof = await createRegistrationProof();
    if (!proof) return;

    // Step 2: Check if already registered
    const alreadyRegistered = await checkRegistration(
      proof.registrationData.handleTiktok
    );

    if (alreadyRegistered) {
      alert('Ya estás registrado!');
      return;
    }

    // Step 3: Submit to blockchain
    const txHash = await submitRegistration(proof);

    if (txHash) {
      console.log('Registration successful!', txHash);
    }
  }

  return (
    <>
      <button onClick={handleFullRegistration} disabled={isRegistering}>
        {isRegistering ? 'Registrando...' : 'Registrarse en Campaña'}
      </button>
      {registerTxHash && <p>Tx: {registerTxHash}</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
    </>
  );
}
```

### API:

| Función | Descripción | Retorno |
|---------|-------------|---------|
| `submitRegistration(proof)` | Envía registro al contrato | `Promise<0x${string} \| null>` |
| `checkRegistration(handle)` | Verifica si ya está registrado | `Promise<boolean>` |
| `getRegisteredHandles()` | Lista todos los handles registrados | `Promise<string[]>` |
| `getTotalRegistered()` | Total de registrados | `Promise<bigint>` |

### Estado:

- `isRegistering` - Enviando transacción
- `error` - Mensaje de error (parseado)
- `registerTxHash` - Hash de la transacción

### Errores Comunes:

- `"AlreadyRegistered"` → "This handle is already registered"
- `"InvalidState"` → "Campaign is not in Registration state"
- `"InvalidQueriesHash"` → "Invalid queries hash - proof may be from wrong API"

---

## 4️⃣ useSubmission

**Archivo**: `app/hooks/useSubmission.ts`

**Propósito**: Generar proofs de submission (4 campos: campaignId, handleTiktok, scoreCalidad, urlVideo).

### Uso:

```typescript
import { useSubmission } from '@/hooks/useSubmission';

function SubmitProofStep() {
  const {
    handleTiktok,
    setHandleTiktok,
    isLoading,
    submissionProof,
    error,
    createSubmissionProof,
  } = useSubmission();

  async function handleSubmit() {
    const proof = await createSubmissionProof();

    if (proof) {
      console.log('Submission proof ready:', {
        campaignId: proof.submissionData.campaignId,
        handleTiktok: proof.submissionData.handleTiktok,
        score: proof.submissionData.scoreCalidad,
        videoUrl: proof.submissionData.urlVideo,
      });

      // Pasar proof a useSubmitOnChain
    }
  }

  return (
    <div>
      <input
        value={handleTiktok}
        onChange={(e) => setHandleTiktok(e.target.value)}
        placeholder="@tu_handle"
      />
      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Generando proof...' : 'Generar Submission Proof'}
      </button>
    </div>
  );
}
```

### API:

| Función | Descripción | Retorno |
|---------|-------------|---------|
| `generateSubmissionProof()` | Llama a `/api/prove` | `Promise<any>` |
| `compressSubmissionProof()` | Llama a `/api/compress` | `Promise<SubmissionProof \| null>` |
| `createSubmissionProof()` | Flujo completo (generar + comprimir) | `Promise<SubmissionProof \| null>` |
| `reset()` | Limpia estado | `void` |

### Estado:

- `handleTiktok` - Handle a buscar (ej: `@happy_hasbulla_`)
- `isProving` - Generando proof
- `isCompressing` - Comprimiendo proof
- `isLoading` - `isProving || isCompressing`
- `presentation` - Web proof sin comprimir
- `submissionProof` - ZK proof final con `{ zkProof, journalDataAbi, submissionData }`
- `error` - Mensaje de error

---

## 5️⃣ useSubmitOnChain

**Archivo**: `app/hooks/useSubmitOnChain.ts`

**Propósito**: Enviar submissions al contrato inteligente.

### Uso:

```typescript
import { useSubmitOnChain } from '@/hooks/useSubmitOnChain';
import { useSubmission } from '@/hooks/useSubmission';

function SubmitButton() {
  const { createSubmissionProof } = useSubmission();
  const {
    isSubmitting,
    error,
    submitTxHash,
    submitCampaignProof,
    getHandleScore,
  } = useSubmitOnChain(contractAddress);

  async function handleFullSubmission() {
    // Step 1: Generate proof
    const proof = await createSubmissionProof();
    if (!proof) return;

    // Step 2: Submit to blockchain
    const txHash = await submitCampaignProof(proof);

    if (txHash) {
      console.log('Submission successful!', txHash);

      // Step 3: Check score
      const score = await getHandleScore(proof.submissionData.handleTiktok);
      console.log('Your score:', score?.toString());
    }
  }

  return (
    <>
      <button onClick={handleFullSubmission} disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Enviar Proof al Contrato'}
      </button>
      {submitTxHash && <p>Tx: {submitTxHash}</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
    </>
  );
}
```

### API:

| Función | Descripción | Retorno |
|---------|-------------|---------|
| `submitCampaignProof(proof)` | Envía submission al contrato | `Promise<0x${string} \| null>` |
| `getHandleScore(handle)` | Obtiene score del handle | `Promise<bigint \| null>` |
| `getTotalSubmitted()` | Total de submissions | `Promise<bigint>` |
| `getTotalScore()` | Score total acumulado | `Promise<bigint>` |

### Estado:

- `isSubmitting` - Enviando transacción
- `error` - Mensaje de error (parseado)
- `submitTxHash` - Hash de la transacción

### Errores Comunes:

- `"NotRegistered"` → "Handle must be registered before submitting proof"
- `"AlreadySubmitted"` → "This handle has already submitted a proof"
- `"InvalidState"` → "Campaign is not in WaitingForProofs state"

---

## 6️⃣ useClaimReward

**Archivo**: `app/hooks/useClaimReward.ts`

**Propósito**: Reclamar recompensas WETH.

### Uso:

```typescript
import { useClaimReward } from '@/hooks/useClaimReward';
import { formatEther } from 'viem';

function ClaimRewardButton({ handle }: { handle: string }) {
  const {
    isClaiming,
    error,
    claimTxHash,
    claimReward,
    getRewardAmount,
    hasClaimed,
    getRewardPercentage,
  } = useClaimReward(contractAddress);

  const [rewardInfo, setRewardInfo] = useState<{
    amount: string;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    async function fetchRewardInfo() {
      const reward = await getRewardAmount(handle);
      const percentage = await getRewardPercentage(handle);

      if (reward && percentage !== null) {
        setRewardInfo({
          amount: reward.formattedAmount,
          percentage,
        });
      }
    }

    fetchRewardInfo();
  }, [handle]);

  async function handleClaim() {
    const claimed = await hasClaimed(handle);
    if (claimed) {
      alert('Ya reclamaste tu reward!');
      return;
    }

    const txHash = await claimReward(handle);

    if (txHash) {
      console.log('Reward claimed!', txHash);
    }
  }

  return (
    <div>
      {rewardInfo && (
        <div>
          <p>Reward disponible: {rewardInfo.amount} WETH</p>
          <p>Porcentaje del pool: {rewardInfo.percentage.toFixed(2)}%</p>
        </div>
      )}

      <button onClick={handleClaim} disabled={isClaiming}>
        {isClaiming ? 'Reclamando...' : 'Reclamar WETH'}
      </button>

      {claimTxHash && <p>Tx: {claimTxHash}</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}
```

### API:

| Función | Descripción | Retorno |
|---------|-------------|---------|
| `claimReward(handle)` | Reclama WETH del contrato | `Promise<0x${string} \| null>` |
| `getRewardAmount(handle)` | Calcula reward claimable | `Promise<{ amount: bigint, formattedAmount: string } \| null>` |
| `hasClaimed(handle)` | Verifica si ya reclamó | `Promise<boolean>` |
| `getHandleScore(handle)` | Obtiene score del handle | `Promise<bigint \| null>` |
| `getTotalScore()` | Score total de campaña | `Promise<bigint>` |
| `getRewardPercentage(handle)` | Calcula % del pool | `Promise<number \| null>` |

### Estado:

- `isClaiming` - Reclamando reward
- `isCheckingReward` - Consultando reward amount
- `isLoading` - `isClaiming || isCheckingReward`
- `error` - Mensaje de error (parseado)
- `claimTxHash` - Hash de la transacción

### Errores Comunes:

- `"AlreadyClaimed"` → "Reward already claimed for this handle"
- `"NoRewardsAvailable"` → "No rewards available to claim"
- `"InvalidState"` → "Campaign must be in Claimable state to claim rewards"

---

## 🔄 Flujo Completo de Uso

### 1. Estado Registration

```typescript
// Componente: RegistrationPhase
const { currentState } = useCampaignState(contractAddress);
const { createRegistrationProof } = useRegistration();
const { submitRegistration } = useRegisterOnChain(contractAddress);

if (currentState === CampaignState.Registration) {
  // 1. Generar proof
  const proof = await createRegistrationProof();

  // 2. Enviar a blockchain
  const txHash = await submitRegistration(proof);
}
```

### 2. Avanzar a WaitingForProofs

```typescript
const { advanceState } = useCampaignState(contractAddress);

await advanceState(); // Solo owner/admin puede llamar
```

### 3. Estado WaitingForProofs

```typescript
// Componente: SubmissionPhase
const { currentState } = useCampaignState(contractAddress);
const { createSubmissionProof, setHandleTiktok } = useSubmission();
const { submitCampaignProof } = useSubmitOnChain(contractAddress);

if (currentState === CampaignState.WaitingForProofs) {
  // 1. Configurar handle
  setHandleTiktok('@happy_hasbulla_');

  // 2. Generar proof
  const proof = await createSubmissionProof();

  // 3. Enviar a blockchain
  const txHash = await submitCampaignProof(proof);
}
```

### 4. Avanzar a Claimable

```typescript
await advanceState();
```

### 5. Estado Claimable

```typescript
// Componente: ClaimPhase
const { currentState } = useCampaignState(contractAddress);
const { claimReward, getRewardAmount } = useClaimReward(contractAddress);

if (currentState === CampaignState.Claimable) {
  // 1. Ver reward disponible
  const reward = await getRewardAmount('@happy_hasbulla_');

  // 2. Reclamar
  const txHash = await claimReward('@happy_hasbulla_');
}
```

---

## 🎨 Ejemplo: Componente Completo

```typescript
'use client';

import { useCampaignState, getStateName } from '@/hooks/useCampaignState';
import { useRegistration } from '@/hooks/useRegistration';
import { useRegisterOnChain } from '@/hooks/useRegisterOnChain';
import { useSubmission } from '@/hooks/useSubmission';
import { useSubmitOnChain } from '@/hooks/useSubmitOnChain';
import { useClaimReward } from '@/hooks/useClaimReward';
import { CampaignState } from '@/lib/types';

export default function CampaignV2Page() {
  const contractAddress = process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS_V2 as `0x${string}`;

  // Campaign state
  const { stats, currentState, advanceState } = useCampaignState(contractAddress);

  // Registration
  const regProof = useRegistration();
  const regOnChain = useRegisterOnChain(contractAddress);

  // Submission
  const subProof = useSubmission();
  const subOnChain = useSubmitOnChain(contractAddress);

  // Claim
  const claim = useClaimReward(contractAddress);

  async function handleRegister() {
    const proof = await regProof.createRegistrationProof();
    if (proof) await regOnChain.submitRegistration(proof);
  }

  async function handleSubmit() {
    const proof = await subProof.createSubmissionProof();
    if (proof) await subOnChain.submitCampaignProof(proof);
  }

  async function handleClaim() {
    await claim.claimReward(subProof.handleTiktok);
  }

  return (
    <div>
      <h1>Campaign V2</h1>
      <h2>Estado: {getStateName(currentState)}</h2>
      <p>Registrados: {stats?.registered.toString()}</p>
      <p>Submissions: {stats?.submitted.toString()}</p>

      {currentState === CampaignState.Registration && (
        <button onClick={handleRegister}>Registrarse</button>
      )}

      {currentState === CampaignState.WaitingForProofs && (
        <>
          <input
            value={subProof.handleTiktok}
            onChange={(e) => subProof.setHandleTiktok(e.target.value)}
          />
          <button onClick={handleSubmit}>Enviar Proof</button>
        </>
      )}

      {currentState === CampaignState.Claimable && (
        <button onClick={handleClaim}>Reclamar Reward</button>
      )}

      <button onClick={advanceState}>Avanzar Estado (Admin)</button>
    </div>
  );
}
```

---

## 📚 Dependencias

Todos los hooks requieren:

```typescript
"use client";

import { useState, useEffect } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { TikTokCampaignVerifierV2Abi } from "@/lib/abi";
```

Asegúrate de tener configurado:
- wagmi v2
- viem
- Contract address en env variables

---

## ✅ Resumen

| Hook | Propósito | Key Functions |
|------|-----------|---------------|
| `useCampaignState` | Monitorear estado | `refreshCampaignState`, `advanceState` |
| `useRegistration` | Generar proof registro | `createRegistrationProof` |
| `useRegisterOnChain` | Enviar registro | `submitRegistration` |
| `useSubmission` | Generar proof submission | `createSubmissionProof` |
| `useSubmitOnChain` | Enviar submission | `submitCampaignProof` |
| `useClaimReward` | Reclamar WETH | `claimReward`, `getRewardAmount` |

**Total: 6 hooks, ~20 funciones principales** 🎣
