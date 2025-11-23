# 🚀 TikTok Campaign Verifier - Sepolia Deployment Summary

## ✅ Deployment Completed Successfully

**Date:** November 22, 2025
**Network:** Sepolia Testnet (Chain ID: 11155111)

---

## 📋 Deployed Contracts

### **TikTokCampaignVerifier**
- **Address:** `0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7`
- **Transaction:** `0x0c00d5dc4b163c43799db42949bdb5b44b7ff6db45b25a2ed0a9a31f08e37b30`
- **Block:** 9685124
- **Gas Used:** 545,664

### **RiscZeroMockVerifier** (for testing)
- **Address:** `0x2fc16e066915a5cf8fe7755c2d6002a1ff8915e7`

---

## 🔐 Contract Parameters

| Parameter | Value |
|-----------|-------|
| **IMAGE_ID** | `0x6a555e28e0d59c20ad0dc76dfa07328f2f68638827dafef87178b306fb02e608` |
| **NOTARY_KEY_FINGERPRINT** | `0xa7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af` |
| **QUERIES_HASH** | `0x344f137f98b9555161309d97e4535ad0522f9ec4836fdbcceeafc8d777991b3a` |
| **CAMPAIGN_ID** | `cmp_001` (hardcoded) |
| **EXPECTED_URL** | `https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json` |

---

## 🔗 Links

### **Etherscan (Sepolia)**
- **Contract:** https://sepolia.etherscan.io/address/0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7
- **Deployment Transaction:** https://sepolia.etherscan.io/tx/0x0c00d5dc4b163c43799db42949bdb5b44b7ff6db45b25a2ed0a9a31f08e37b30

### **Frontend**
- **Local:** http://localhost:3000
- **Network:** http://192.168.0.8:3000

---

## 🧪 Testing the Contract

### **1. Read Campaign ID**
```bash
cast call 0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7 \
  "CAMPAIGN_ID()(string)" \
  --rpc-url https://sepolia.drpc.org
```

### **2. Check Score for a Handle**
```bash
cast call 0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7 \
  "getScore(string)(uint256)" \
  "@happy_hasbulla_" \
  --rpc-url https://sepolia.drpc.org
```

### **3. Verify Contract Parameters**
```bash
# Check QUERIES_HASH
cast call 0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7 \
  "EXPECTED_QUERIES_HASH()(bytes32)" \
  --rpc-url https://sepolia.drpc.org

# Check NOTARY_KEY_FINGERPRINT
cast call 0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7 \
  "EXPECTED_NOTARY_KEY_FINGERPRINT()(bytes32)" \
  --rpc-url https://sepolia.drpc.org
```

---

## 🎯 Frontend Testing Flow

### **Prerequisites**
1. MetaMask or compatible wallet
2. Connected to Sepolia network
3. Some Sepolia ETH for gas (get from faucet: https://sepoliafaucet.com/)

### **Steps to Test**

1. **Access the Frontend**
   ```
   http://localhost:3000
   ```

2. **Generate ZK Proof**
   - The system will automatically call `/api/prove` to get TikTok data
   - URL: `https://gist.githubusercontent.com/.../mockTikTokVideosResponse.json`
   - Expected data: `@happy_hasbulla_` with score `15`

3. **Compress Proof**
   - Click to compress the proof
   - This will extract the 4 fields: `campaign_id`, `handle_tiktok`, `score_calidad`, `url_video`

4. **Submit to Sepolia**
   - Connect your wallet to Sepolia
   - Click to submit the proof
   - Approve the transaction in MetaMask
   - Wait for confirmation

5. **Verify On-Chain**
   - After transaction confirms, check the score:
   ```bash
   cast call 0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7 \
     "getScore(string)(uint256)" \
     "@happy_hasbulla_" \
     --rpc-url https://sepolia.drpc.org
   ```
   - Should return: `15`

---

## 📊 Data Flow

```
┌─────────────────┐
│  TikTok Mock    │
│      API        │
│  (GitHub Gist)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  vlayer Prover  │
│  /prove API     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  vlayer ZK      │
│  /compress API  │
│  (Extract data) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Smart Contract │
│  (Sepolia)      │
│  Verify & Store │
└─────────────────┘
```

---

## 🔍 Extracted Data Format

The ZK proof extracts and verifies these fields:

```json
{
  "campaign_id": "cmp_001",
  "handle_tiktok": "@happy_hasbulla_",
  "score_calidad": 15,
  "url_video": "https://www.tiktok.com/@happy_hasbulla_/video/7574144876586044703"
}
```

---

## 🛡️ Security Validations

The contract performs these validations:

1. ✅ **Notary Key Fingerprint** - Ensures data was notarized by vlayer
2. ✅ **Queries Hash** - Ensures correct fields were extracted
3. ✅ **URL Match** - Ensures data came from the expected API
4. ✅ **Campaign ID** - Ensures campaign is `cmp_001`
5. ✅ **Score Range** - Ensures score is between 1-100
6. ✅ **ZK Proof** - Cryptographic verification via RISC Zero

---

## 📝 Environment Variables

Your `.env.local` file is configured with:

```bash
WEB_PROVER_API_CLIENT_ID=cb6fe73a-e61d-48e4-8358-64e9f0069e4e
WEB_PROVER_API_SECRET=LBvG4eL0oZ5BnReWAScT3TzoPWgCeEFSa0uGeM5JfMOpgfqdGTXL0uSmfX7AyaVW
ZK_PROVER_GUEST_ID=0x6a555e28e0d59c20ad0dc76dfa07328f2f68638827dafef87178b306fb02e608

# Frontend Configuration (Sepolia)
NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
```

---

## 🎉 Ready to Test!

Your TikTok Campaign Verifier is now deployed and ready to test on Sepolia!

1. ✅ Contract deployed with correct parameters
2. ✅ Frontend configured for Sepolia
3. ✅ Development server running
4. ✅ Ready to generate and submit ZK proofs

**Next steps:**
- Open http://localhost:3000 in your browser
- Connect your wallet to Sepolia
- Generate a proof for `@happy_hasbulla_`
- Submit it to the contract
- Verify the score was stored on-chain!

---

## 📞 Support

If you encounter issues:
1. Check that your wallet is on Sepolia network
2. Ensure you have Sepolia ETH
3. Verify the contract address in `.env.local`
4. Check browser console for errors
5. Review the Next.js logs in `/tmp/nextjs_sepolia.log`
