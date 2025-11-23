# 🚀 TikTok Campaign Verifier V2 - Deployment Guide

## ✅ Prerequisites

Before deploying the V2 contract, ensure you have:

### 1. Environment Variables Configured

Your `.env` file must contain:

```bash
# ZK Prover Configuration
ZK_PROVER_GUEST_ID=0x6a555e28...  # Your RISC Zero image ID
NOTARY_KEY_FINGERPRINT=0xa7e62d7f...  # TLS notary fingerprint

# V2 Specific - Two QUERIES_HASH values
REGISTRATION_QUERIES_HASH=0x18a43ad3cc574a0be53e2fb789556333e5d82db2b223c62d9edb401d9b791346
SUBMISSION_QUERIES_HASH=0x344f137f98b9555161309d97e4535ad0522f9ec4836fdbcceeafc8d777991b3a

# V2 Specific - Two API URLs
REGISTRATION_URL=https://gist.githubusercontent.com/dpinones/db8d90fd1e2c98ee7d7ddf586bf42fe3/raw/410e8ebb0b8f2d91ae8d2050f069c1e39f3a083a/registry.json
SUBMISSION_URL=https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json

# V2 Specific - WETH Token Address
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14  # Sepolia WETH

# Deployment Configuration
PRIVATE_KEY=0x...  # Your deployer private key
SEPOLIA_RPC_URL=https://...  # Your Sepolia RPC URL
```

### 2. Calculate QUERIES_HASH Values (if not done)

If you need to recalculate the hashes:

```bash
# Start your Next.js app first
npm run dev

# In another terminal, run the hash calculation script
chmod +x calculate-queries-hashes.sh
./calculate-queries-hashes.sh
```

This will:
1. Generate a registration proof
2. Extract REGISTRATION_QUERIES_HASH
3. Generate a submission proof
4. Extract SUBMISSION_QUERIES_HASH
5. Optionally update your `.env` file

### 3. Compile Contracts

```bash
cd contracts
forge build
```

Verify that `TikTokCampaignVerifierV2.sol` compiles successfully.

---

## 🏗️ Deployment Options

### Option 1: Deploy to Local Anvil (Testing)

1. **Start Anvil**:
```bash
anvil
```

2. **Deploy V2 Contract**:
```bash
cd contracts
npm run deploy-v2:anvil
```

This will:
- Deploy a mock RISC Zero verifier
- Deploy TikTokCampaignVerifierV2 with test configuration
- Save deployment info to `deployments/anvil-v2.json`

3. **Update Frontend .env**:
```bash
NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS_V2=<deployed_address>
```

### Option 2: Deploy to Sepolia Testnet

1. **Ensure you have Sepolia ETH**:
```bash
# Check your balance
cast balance <YOUR_ADDRESS> --rpc-url $SEPOLIA_RPC_URL
```

Get testnet ETH from: https://sepoliafaucet.com/

2. **Deploy to Sepolia**:
```bash
cd contracts
npm run deploy-v2:sepolia
```

3. **Save the contract address** from the output

4. **Update Frontend .env**:
```bash
NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS_V2=<deployed_address>
```

5. **Verify on Etherscan** (optional but recommended):
```bash
forge verify-contract <ADDRESS> \
  src/TikTokCampaignVerifierV2.sol:TikTokCampaignVerifierV2 \
  --chain sepolia \
  --watch
```

### Option 3: Deploy to Other Networks

Supported networks:
- `base-sepolia` - Base Sepolia testnet
- `op-sepolia` - Optimism Sepolia testnet
- `arbitrum-sepolia` - Arbitrum Sepolia testnet

```bash
npm run deploy-v2:<network>
```

---

## 📊 V2 Contract Constructor Parameters

The V2 contract requires **8 parameters**:

| Parameter | Type | Description | Source |
|-----------|------|-------------|--------|
| `_verifier` | address | RISC Zero verifier address | Deployed or provided |
| `_imageId` | bytes32 | RISC Zero guest program ID | `ZK_PROVER_GUEST_ID` |
| `_expectedNotaryKeyFingerprint` | bytes32 | TLS notary fingerprint | `NOTARY_KEY_FINGERPRINT` |
| `_registrationQueriesHash` | bytes32 | Hash for registration proof | `REGISTRATION_QUERIES_HASH` |
| `_submissionQueriesHash` | bytes32 | Hash for submission proof | `SUBMISSION_QUERIES_HASH` |
| `_registrationUrl` | string | Registry JSON URL | `REGISTRATION_URL` |
| `_submissionUrl` | string | TikTok videos JSON URL | `SUBMISSION_URL` |
| `_weth` | address | WETH token address | `WETH_ADDRESS` |

---

## 🧪 Post-Deployment Testing

### 1. Verify Contract State

```bash
# Check current campaign state (should be 0 = Registration)
cast call <CONTRACT_ADDRESS> "currentState()(uint8)" --rpc-url <RPC_URL>

# Get campaign stats
cast call <CONTRACT_ADDRESS> "getCampaignStats()(uint256,uint256,uint256,uint8)" --rpc-url <RPC_URL>
```

### 2. Test Registration Phase

Generate a registration proof:

```bash
curl -X POST http://localhost:3000/api/prove-register | jq > /tmp/reg-presentation.json

curl -X POST http://localhost:3000/api/compress-register \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/reg-presentation.json)}" | jq > /tmp/reg-proof.json
```

Submit registration on-chain:

```bash
# Extract journalDataAbi and zkProof from /tmp/reg-proof.json
cast send <CONTRACT_ADDRESS> \
  "register(bytes,bytes)" \
  <journalDataAbi> \
  <zkProof> \
  --private-key $PRIVATE_KEY \
  --rpc-url <RPC_URL>
```

Verify registration:

```bash
cast call <CONTRACT_ADDRESS> \
  "isRegistered(string)(bool)" \
  "@happy_hasbulla_" \
  --rpc-url <RPC_URL>
```

### 3. Advance to WaitingForProofs State

```bash
cast send <CONTRACT_ADDRESS> "advanceState()" \
  --private-key $PRIVATE_KEY \
  --rpc-url <RPC_URL>

# Verify state changed (should be 1 = WaitingForProofs)
cast call <CONTRACT_ADDRESS> "currentState()(uint8)" --rpc-url <RPC_URL>
```

### 4. Test Submission Phase

Generate a submission proof:

```bash
curl -X POST http://localhost:3000/api/prove | jq > /tmp/sub-presentation.json

curl -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d "{\"presentation\":$(cat /tmp/sub-presentation.json),\"handleTiktok\":\"@happy_hasbulla_\"}" | jq > /tmp/sub-proof.json
```

Submit proof on-chain:

```bash
cast send <CONTRACT_ADDRESS> \
  "submitCampaign(bytes,bytes)" \
  <journalDataAbi> \
  <zkProof> \
  --private-key $PRIVATE_KEY \
  --rpc-url <RPC_URL>
```

Verify score:

```bash
cast call <CONTRACT_ADDRESS> \
  "scoresByHandle(string)(uint256)" \
  "@happy_hasbulla_" \
  --rpc-url <RPC_URL>
```

### 5. Advance to Claimable State

```bash
cast send <CONTRACT_ADDRESS> "advanceState()" \
  --private-key $PRIVATE_KEY \
  --rpc-url <RPC_URL>

# Verify state changed (should be 2 = Claimable)
cast call <CONTRACT_ADDRESS> "currentState()(uint8)" --rpc-url <RPC_URL>
```

### 6. Test Reward Claiming

First, deposit WETH into the contract:

```bash
# For testing, send some WETH to the contract
cast send $WETH_ADDRESS \
  "deposit()" \
  --value 0.1ether \
  --private-key $PRIVATE_KEY \
  --rpc-url <RPC_URL>

cast send $WETH_ADDRESS \
  "transfer(address,uint256)" \
  <CONTRACT_ADDRESS> \
  100000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url <RPC_URL>
```

Check claimable reward:

```bash
cast call <CONTRACT_ADDRESS> \
  "getRewardAmount(string)(uint256)" \
  "@happy_hasbulla_" \
  --rpc-url <RPC_URL>
```

Claim reward:

```bash
cast send <CONTRACT_ADDRESS> \
  "claimReward(string)" \
  "@happy_hasbulla_" \
  --private-key $PRIVATE_KEY \
  --rpc-url <RPC_URL>
```

Verify claim:

```bash
cast call <CONTRACT_ADDRESS> \
  "hasClaimed(string)(bool)" \
  "@happy_hasbulla_" \
  --rpc-url <RPC_URL>
```

---

## 🔧 Troubleshooting

### Error: "REGISTRATION_QUERIES_HASH not set"

**Solution**: Run `./calculate-queries-hashes.sh` to generate both hashes

### Error: "WETH_ADDRESS not set"

**Solution**: Add WETH address to `.env`:
- Sepolia: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
- Other networks: Check https://weth.io/

### Error: "InvalidQueriesHash()"

**Cause**: The JMESPath queries in your proof don't match the hash stored in the contract

**Solution**:
1. Regenerate hashes using `./calculate-queries-hashes.sh`
2. Redeploy contract with updated hashes
3. Ensure API routes use the correct URLs

### Error: "InvalidState()"

**Cause**: Trying to call a function in the wrong state

**Solution**: Check current state and advance if needed:
```bash
cast call <CONTRACT_ADDRESS> "currentState()(uint8)" --rpc-url <RPC_URL>
cast send <CONTRACT_ADDRESS> "advanceState()" --private-key $PRIVATE_KEY --rpc-url <RPC_URL>
```

### Error: "NotRegistered()"

**Cause**: Trying to submit proof without registering first

**Solution**: Call `register()` before `submitCampaign()`

---

## 📚 Related Documentation

- [V2 Architecture](./CAMPAIGN_V2_ARCHITECTURE.md) - Complete system design
- [Implementation Status](./V2_IMPLEMENTATION_STATUS.md) - Current progress
- [API Migration Guide](./API_ENDPOINT_MIGRATION_GUIDE.md) - Endpoint changes

---

## 🎯 Next Steps After Deployment

1. **Update Frontend Environment**:
   - Add deployed contract address
   - Configure network settings

2. **Create React Hooks**:
   - `useCampaignState.ts` - State management
   - `useRegistration.ts` - Registration flow
   - `useClaimReward.ts` - Reward claiming

3. **Build UI Components**:
   - Registration form
   - Proof submission interface
   - Reward claiming button
   - Campaign statistics dashboard

4. **End-to-End Testing**:
   - Test complete user journey
   - Verify state transitions
   - Test reward distribution
   - Monitor gas costs

---

## 📝 Deployment Checklist

- [ ] `.env` configured with all 8+ required variables
- [ ] QUERIES_HASH values calculated correctly
- [ ] Contract compiled successfully
- [ ] Network RPC URL configured
- [ ] Deployer has sufficient ETH
- [ ] WETH address verified for target network
- [ ] Contract deployed successfully
- [ ] Deployment info saved to `deployments/<network>-v2.json`
- [ ] Contract verified on block explorer (if public network)
- [ ] Frontend `.env` updated with contract address
- [ ] Registration phase tested
- [ ] Submission phase tested
- [ ] Reward claiming tested

---

**Happy Deploying!** 🚀
