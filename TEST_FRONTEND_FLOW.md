# 🧪 Testing the TikTok Frontend

## ✅ Backend APIs Fixed

The following changes were made to fix the 400 error:

### 1. **Updated `app/lib/api.ts`**
- ✅ `proveContributions()` - No longer requires GitHub parameters
- ✅ `compressPresentation()` - Now uses `handleTiktok` instead of `username`

### 2. **Updated `app/hooks/useProveFlow.ts`**
- ✅ Simplified to use `handleTiktok` instead of GitHub-specific fields
- ✅ Removed `url`, `githubToken`, `isPrivateRepo` state
- ✅ Updated `decodeJournalData` to extract TikTok campaign data

### 3. **Updated `app/lib/utils.ts`**
- ✅ `decodeJournalData()` now decodes TikTok fields:
  - `campaignId`
  - `handleTiktok`
  - `scoreCalidad`
  - `urlVideo`

---

## 🚀 How to Test

### **Option 1: Via Browser UI**

1. **Open the frontend:**
   ```
   http://localhost:3000
   ```

2. **The UI should show:**
   - TikTok handle input (default: `@happy_hasbulla_`)
   - "Generate ZK Proof" button
   - After successful generation, you'll see the campaign data

3. **Click "Generate ZK Proof"**
   - This will automatically:
     - Call `/api/prove` (GET request to TikTok mock API)
     - Call `/api/compress` (extract the 4 fields)
     - Show you the decoded data

4. **Submit to Sepolia:**
   - Connect your wallet to Sepolia
   - Click submit
   - Approve the transaction

---

### **Option 2: Test APIs Directly**

#### **Step 1: Generate Proof**
```bash
curl -X POST http://localhost:3000/api/prove \
  -H "Content-Type: application/json" \
  -d '{}' \
  -s | jq '.success'
```

Expected: `true`

#### **Step 2: Full Flow Test**
```bash
# Save this as test_full_flow.sh
#!/bin/bash

echo "=== Step 1: Generate Proof ==="
PROVE_RESPONSE=$(curl -X POST http://localhost:3000/api/prove \
  -H "Content-Type: application/json" \
  -d '{}' -s)

echo $PROVE_RESPONSE | jq '.success'

echo ""
echo "=== Step 2: Compress Proof ==="
curl -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d "{\"presentation\": $PROVE_RESPONSE, \"handleTiktok\": \"@happy_hasbulla_\"}" \
  -s | jq '.data | {zkProof: .zkProof[:66], journalDataAbi: .journalDataAbi[:66]}'
```

---

## 📊 Expected Data Flow

```
User clicks "Generate ZK Proof"
         ↓
    /api/prove
         ↓
   vlayer Prover
    (GET TikTok API)
         ↓
    Presentation
         ↓
   /api/compress
         ↓
Extract: campaign_id, handle_tiktok, score_calidad, url_video
         ↓
    ZK Proof Ready
         ↓
   Submit to Contract
         ↓
  Score stored on-chain!
```

---

## 🔧 Troubleshooting

### **If you still get HTTP 400:**

1. **Check the browser console** (F12)
   - Look for the actual error message
   - Share the full error for debugging

2. **Check the Next.js logs:**
   ```bash
   # Find the Next.js process
   ps aux | grep "next dev"

   # Or check if there are any error logs
   ls -la /tmp/nextjs*.log
   ```

3. **Hard refresh the browser:**
   - Chrome/Firefox: `Ctrl + Shift + R` (Windows/Linux)
   - Mac: `Cmd + Shift + R`

4. **Verify the server restarted:**
   ```bash
   curl http://localhost:3000/api/prove \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{}' \
     -s | jq '.'
   ```

---

## 📝 What Changed From GitHub to TikTok

| GitHub (Old) | TikTok (New) |
|--------------|--------------|
| `query`, `variables`, `githubToken` | No parameters needed |
| `username` | `handleTiktok` |
| `url` input | Fixed URL (in API) |
| `repo`, `contributions` | `campaignId`, `scoreCalidad`, `urlVideo` |
| POST with GraphQL query | Simple GET request |

---

## ✅ Verification Checklist

- [x] `/api/prove` returns `success: true`
- [x] `/api/compress` extracts 4 fields correctly
- [ ] Frontend loads without errors
- [ ] "Generate ZK Proof" button works
- [ ] Decoded data shows TikTok campaign info
- [ ] Can submit to Sepolia contract

---

## 🎯 Next Steps

Once the proof is generated successfully:

1. **Connect wallet to Sepolia**
2. **Submit the proof**
3. **Verify on-chain:**
   ```bash
   cast call 0x6017a2f58fab8dc33496a4bbed54ab3b77b0b2f7 \
     "getScore(string)(uint256)" \
     "@happy_hasbulla_" \
     --rpc-url https://sepolia.drpc.org
   ```

   Should return: `15`

---

## 📞 Need Help?

If you're still getting errors:
1. Share the exact error message from the browser console
2. Check if the server is running: `lsof -ti:3000`
3. Try a hard refresh or restart the server
