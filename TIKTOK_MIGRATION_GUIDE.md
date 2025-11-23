# 🎯 Guía de Migración a TikTok Campaign Verifier

## ✅ Cambios Implementados

Todos los archivos han sido actualizados para soportar el nuevo caso de uso de TikTok. El sistema ahora verifica campañas de TikTok en lugar de contribuciones de GitHub.

### 📋 Archivos Modificados

1. **Contrato Solidity**
   - ✅ Creado: `contracts/src/TikTokCampaignVerifier.sol`
   - Función principal: `submitCampaign()` en lugar de `submitContribution()`
   - Campaña fija: `cmp_001` (hardcoded en el contrato)
   - Mapping simplificado: `handleTiktok => score`

2. **APIs**
   - ✅ `app/api/prove/route.ts` - Ahora hace GET a la URL de TikTok
   - ✅ `app/api/compress/route.ts` - Extrae campos de TikTok con JMESPath

3. **TypeScript**
   - ✅ `app/lib/types.ts` - Nuevos tipos `CampaignData`
   - ✅ `app/lib/abi.ts` - ABI actualizado con `TikTokCampaignVerifierAbi`

4. **Configuración**
   - ✅ `.env` - Variables actualizadas para TikTok
   - ✅ `contracts/scripts/deploy.ts` - Script de deploy actualizado

---

## 🔧 Próximos Pasos

### 1. Generar tu Primera Prueba ZK

```bash
# El sistema está configurado para obtener datos de:
# https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json
```

Necesitas ejecutar el flujo completo para obtener el `QUERIES_HASH` correcto:

1. Inicia el servidor Next.js
2. Genera una prueba con la nueva API
3. El `QUERIES_HASH` se calculará automáticamente

### 2. Actualizar QUERIES_HASH

Después de generar tu primera prueba, obtendrás el hash correcto de las queries. Debes actualizar `.env`:

```bash
# Reemplaza este valor temporal
QUERIES_HASH=0x0000000000000000000000000000000000000000000000000000000000000000

# Con el valor real que obtengas de la respuesta de vlayer
QUERIES_HASH=0x<valor_real_de_vlayer>
```

### 3. Desplegar el Contrato

Una vez tengas el `QUERIES_HASH` correcto:

```bash
# Local (Anvil)
cd contracts
npm run deploy:anvil

# Sepolia Testnet
npm run deploy:sepolia
```

---

## 📊 Estructura de Datos

### JSON de la API de TikTok
```json
{
  "campaign_id": "cmp_001",
  "handle_tiktok": "@happy_hasbulla_",
  "score_calidad": 15,
  "url_video": "https://www.tiktok.com/@happy_hasbulla_/video/7574144876586044703"
}
```

### Campos Extraídos (JMESPath)
```typescript
[
  "campaign_id",      // string - Siempre debe ser "cmp_001"
  "handle_tiktok",    // string - Handle del usuario
  "score_calidad",    // number - Score entre 1-100
  "url_video"         // string - URL del video
]
```

### Datos del Contrato
```solidity
// Mapping simplificado (campaign fijo = cmp_001)
mapping(string => uint256) public scoresByHandle;

// Evento emitido al verificar
event CampaignVerified(
    string indexed handleTiktok,
    string indexed campaignId,
    uint256 scoreCalidad,
    string urlVideo,
    uint256 timestamp,
    uint256 blockNumber
);
```

---

## 🔐 Variables de Seguridad

### NOTARY_KEY_FINGERPRINT
- **Valor actual**: `0xa7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af`
- **Propósito**: Verifica que los datos fueron notarizados por vlayer
- **¿Cambiar?**: ❌ NO - Es del servicio de vlayer

### QUERIES_HASH
- **Valor actual**: `0x0000000000000000000000000000000000000000000000000000000000000000` (temporal)
- **Propósito**: Valida que se extrajeron los campos correctos
- **¿Cambiar?**: ✅ SÍ - Debes obtenerlo de tu primera prueba ZK

### EXPECTED_URL
- **Valor actual**: URL del Gist con datos mock de TikTok
- **Propósito**: Valida que los datos provienen de la fuente correcta
- **¿Cambiar?**: Si cambias la URL de la API, actualiza esto también

---

## 🧪 Testing

### Anvil Local
```bash
# Terminal 1: Inicia Anvil
anvil

# Terminal 2: Deploy
export ANVIL_RPC_URL=http://127.0.0.1:8545
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
cd contracts
npm run deploy:anvil

# Guarda la dirección del contrato
export CONTRACT_ADDRESS=0x<tu_direccion>
```

### Verificar Datos en el Contrato
```bash
# Ver el score de un handle
cast call $CONTRACT_ADDRESS "getScore(string)(uint256)" "@happy_hasbulla_" --rpc-url $ANVIL_RPC_URL

# Ver la campaña ID
cast call $CONTRACT_ADDRESS "CAMPAIGN_ID()(string)" --rpc-url $ANVIL_RPC_URL
```

---

## ⚠️ Notas Importantes

1. **Campaña Fija**: El contrato solo acepta `campaign_id = "cmp_001"`. Cualquier otro ID será rechazado.

2. **Rango de Score**: El score debe estar entre 1-100. Valores fuera de este rango serán rechazados.

3. **Simplificación**: Ya no hay mapping de 2 niveles (repo => user). Ahora es directo: `handleTiktok => score`.

4. **Queries Hash**: Este valor DEBE coincidir con el generado por vlayer al comprimir la prueba. Si no coincide, la transacción revertirá.

---

## 🔄 Comparación: Antes vs Ahora

| Aspecto | GitHub (Antes) | TikTok (Ahora) |
|---------|---------------|----------------|
| **Contrato** | `GitHubContributionVerifier` | `TikTokCampaignVerifier` |
| **Función** | `submitContribution()` | `submitCampaign()` |
| **Campos** | username, contributions, repo | handleTiktok, scoreCalidad, campaignId, urlVideo |
| **Mapping** | `repo => user => contributions` | `handleTiktok => score` |
| **API** | GraphQL POST | REST GET |
| **URL** | `api.github.com/graphql` | Gist con datos mock |
| **Auth** | GitHub Token | Sin auth |
| **Queries** | 3 campos (repo, login, PRs) | 4 campos (campaign, handle, score, url) |

---

## 📝 Siguiente Paso Crítico

**IMPORTANTE**: Antes de desplegar el contrato, necesitas:

1. Generar una prueba ZK con las nuevas queries
2. Extraer el `QUERIES_HASH` de la respuesta de vlayer
3. Actualizar `.env` con el hash correcto
4. Luego sí, desplegar el contrato

De lo contrario, el contrato se desplegará con un `QUERIES_HASH` incorrecto y todas las pruebas serán rechazadas.

---

## 🎉 Listo para Producción

Una vez completes estos pasos, el sistema estará listo para:
- ✅ Verificar campañas de TikTok
- ✅ Almacenar scores on-chain
- ✅ Validar que los datos provienen de la API correcta
- ✅ Garantizar integridad criptográfica con ZK proofs
