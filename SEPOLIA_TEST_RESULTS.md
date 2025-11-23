# Resultados de Pruebas en Sepolia - TikTok Campaign Verifier

## ✅ Deployment Exitoso

**Contract Address**: `0x7e0be09eb3c0475748e0ae9c0f6ed26ea5801508`
**Network**: Sepolia (Chain ID: 11155111)
**Deployer**: 0xEBdf70B26e5e7520B8B79e1D01eD832f48972B09

### Parámetros del Contrato Verificados

```bash
✓ QUERIES_HASH: 0x344f137f98b9555161309d97e4535ad0522f9ec4836fdbcceeafc8d777991b3a
✓ Expected URL: https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json
✓ Campaign ID: cmp_001
```

## ✅ Prueba On-Chain Exitosa

### Datos de la Transacción

- **TX Hash**: `0x54a8e22198a207a264a31969a52dfedddac41893d66450a0cf9e5c80b5c74302`
- **Status**: ✅ Success
- **Gas Used**: 80,403
- **Block**: 9685293

### Datos Verificados en Chain

- **Campaign ID**: cmp_001
- **TikTok Handle**: @happy_hasbulla_
- **Score Calidad**: 15
- **URL Video**: https://www.tiktok.com/@happy_hasbulla_/video/7574144876586044703

### Verificación del Storage

```bash
$ cast call 0x7e0be09eb3c0475748e0ae9c0f6ed26ea5801508 "scoresByHandle(string)(uint256)" "@happy_hasbulla_" --rpc-url https://sepolia.drpc.org
15
```

✅ El score se almacenó correctamente en el contrato

## 🔗 Enlaces

- **Contract en Etherscan**: https://sepolia.etherscan.io/address/0x7e0be09eb3c0475748e0ae9c0f6ed26ea5801508
- **Transacción de Prueba**: https://sepolia.etherscan.io/tx/0x54a8e22198a207a264a31969a52dfedddac41893d66450a0cf9e5c80b5c74302

## 🧪 Probar desde el Frontend

### 1. Configuración

El archivo `.env` ya está configurado con:

```bash
NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=0x7e0be09eb3c0475748e0ae9c0f6ed26ea5801508
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
```

### 2. Iniciar el Frontend

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador

### 3. Pasos para Probar

1. **Ingresar TikTok Handle**: Usar `@happy_hasbulla_` (o cualquier handle)
2. **Click "Generate ZK Proof"**: Esto generará el proof desde la API de TikTok mock
3. **Click "Compress & Extract Data"**: Esto comprimirá el proof y extraerá los datos
4. **Conectar Wallet**: Conecta tu wallet a la red Sepolia
5. **Verificar que estés en Sepolia**: El sistema auto-cambiará si es necesario
6. **Ingresar Contract Address** (si no está pre-llenado): `0x7e0be09eb3c0475748e0ae9c0f6ed26ea5801508`
7. **Click "Submit On-Chain"**: Esto enviará la transacción al contrato

### 4. Qué Esperar

- ✅ La transacción debería ser exitosa
- ✅ El evento `CampaignVerified` debería emitirse
- ✅ El score debería almacenarse en `scoresByHandle[@happy_hasbulla_]`
- ✅ Deberías ser redirigido a `/success` con los detalles

## 🐛 Debugging

Si la transacción falla:

1. **Verificar Network**: Asegúrate de estar en Sepolia (Chain ID: 11155111)
2. **Verificar Balance**: Necesitas ETH de Sepolia para gas
3. **Verificar Contract Address**: Debe ser `0x7e0be09eb3c0475748e0ae9c0f6ed26ea5801508`
4. **Ver Error en Etherscan**: Busca el TX hash en Sepolia Etherscan para ver el error detallado

### Errores Comunes

- **InvalidQueriesHash**: El QUERIES_HASH del proof no coincide con el del contrato
- **InvalidNotaryKeyFingerprint**: El notary fingerprint no es válido
- **InvalidCampaignId**: El campaign ID no es "cmp_001"
- **InvalidScore**: El score está fuera del rango válido (0-100)

## 📊 Resultados de la Prueba

| Item | Status |
|------|--------|
| Deployment del contrato | ✅ |
| Parámetros correctos on-chain | ✅ |
| Generación de ZK Proof | ✅ |
| Compresión del proof | ✅ |
| Decodificación de journal data | ✅ |
| Submission on-chain | ✅ |
| Verificación del storage | ✅ |

## 🎉 Conclusión

El sistema **TikTok Campaign Verifier** está completamente funcional en Sepolia testnet:

- ✅ El contrato se desplegó con los parámetros correctos de TikTok
- ✅ Se generó un ZK proof exitosamente desde la API mock de TikTok
- ✅ El proof se verificó y almacenó on-chain correctamente
- ✅ El score se puede consultar desde el contrato

**El frontend está listo para probarse en http://localhost:3000**
