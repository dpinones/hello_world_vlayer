import { createWalletClient, createPublicClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import { getNetworkConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Contract bytecode and ABI (will be loaded from forge artifacts)
function loadContractArtifact() {
  const artifactPath = path.join(__dirname, '../out/TikTokCampaignVerifierV2.sol/TikTokCampaignVerifierV2.json');

  if (!fs.existsSync(artifactPath)) {
    throw new Error('Contract not compiled. Run: forge build');
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object as Hex,
  };
}

// Load RiscZeroMockVerifier artifact (from risc0-ethereum library)
function loadMockVerifierArtifact() {
  const artifactPath = path.join(
    __dirname,
    '../out/RiscZeroMockVerifier.sol/RiscZeroMockVerifier.json'
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error('Mock verifier not compiled. Run: forge build');
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object as Hex,
  };
}

async function deployMockVerifier(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  account: ReturnType<typeof privateKeyToAccount>
): Promise<Hex> {
  const { abi, bytecode } = loadMockVerifierArtifact();
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    account,
    chain: walletClient.chain,
    args: ['0xFFFFFFFF'],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error('Mock verifier deployment failed - no contract address in receipt');
  }
  return receipt.contractAddress as Hex;
}

interface DeployOptions {
  network: string;
  verify?: boolean;
  verifierAddress?: Hex;
}

async function deploy(options: DeployOptions) {
  const { network, verify = false, verifierAddress: providedVerifier } = options;

  console.log(`\n=== Deploying V2 Contract to ${network} ===\n`);

  // Get network configuration
  const networkConfig = getNetworkConfig(network);

  // Use SEPOLIA_RPC_URL from .env if deploying to sepolia
  let rpcUrl = networkConfig.rpcUrl;
  if (network === 'sepolia') {
    const sepoliaRpcUrl = "https://rpc.celocolombia.org";
    // const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
    if (sepoliaRpcUrl) {
      rpcUrl = sepoliaRpcUrl;
      console.log(`Using SEPOLIA_RPC_URL from .env`);
    } else {
      console.log(`SEPOLIA_RPC_URL not set in .env, using default: ${rpcUrl}`);
    }
  }

  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${networkConfig.chain.id}`);
  console.log(`RPC URL: ${rpcUrl}`);

  // Setup wallet
  // const privateKey = process.env.PRIVATE_KEY;
  const privateKey = "0xe3186d07c12a87ec67c5d69ae6d31fdffd21c5d9652a0921bbc7a34585452981";
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment variables');
  }

  const account = privateKeyToAccount(privateKey as Hex);
  console.log(`\nDeployer address: ${account.address}`);

  // Create clients
  const publicClient = createPublicClient({
    chain: networkConfig.chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: networkConfig.chain,
    transport: http(rpcUrl),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${balance} wei (${Number(balance) / 1e18} ETH)`);

  if (balance === BigInt(0)) {
    throw new Error('Deployer has no funds');
  }

  // Get or deploy verifier
  let verifierAddress: Hex | undefined = providedVerifier;
  if (!verifierAddress) {
    console.log(`\nNo verifier address provided. Deploying RiscZeroMockVerifier...`);
    verifierAddress = await deployMockVerifier(walletClient, publicClient, account);
    console.log(`RiscZeroMockVerifier deployed at: ${verifierAddress}`);
  }

  // V2: Read 7 constructor parameters (CCOP is now a constant in the contract)
  const imageId = process.env.ZK_PROVER_GUEST_ID as Hex;
  const notaryKeyFingerprint = process.env.NOTARY_KEY_FINGERPRINT as Hex;
  const registrationQueriesHash = process.env.REGISTRATION_QUERIES_HASH as Hex;
  const submissionQueriesHash = process.env.SUBMISSION_QUERIES_HASH as Hex;
  const registrationUrl = process.env.REGISTRATION_URL || 'https://gist.githubusercontent.com/dpinones/db8d90fd1e2c98ee7d7ddf586bf42fe3/raw/410e8ebb0b8f2d91ae8d2050f069c1e39f3a083a/registry.json';
  const submissionUrl = process.env.SUBMISSION_URL || 'https://gist.githubusercontent.com/dpinones/7ddebc14210d404ca6d4951528ff1036/raw/64e6e3c9ab44623903744219034c06eafb8e312b/mockTikTokVideosResponse.json';

  // Validate required parameters
  if (!imageId || imageId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    throw new Error('ZK_PROVER_GUEST_ID not set');
  }

  if (!notaryKeyFingerprint || notaryKeyFingerprint === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    throw new Error('NOTARY_KEY_FINGERPRINT not set');
  }

  if (!registrationQueriesHash || registrationQueriesHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    throw new Error('REGISTRATION_QUERIES_HASH not set');
  }

  if (!submissionQueriesHash || submissionQueriesHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    throw new Error('SUBMISSION_QUERIES_HASH not set');
  }

  console.log(`\nV2 Deployment Parameters:`);
  console.log(`  Verifier: ${verifierAddress}`);
  console.log(`  Image ID: ${imageId}`);
  console.log(`  Notary Key Fingerprint: ${notaryKeyFingerprint}`);
  console.log(`  Registration Queries Hash: ${registrationQueriesHash}`);
  console.log(`  Submission Queries Hash: ${submissionQueriesHash}`);
  console.log(`  Registration URL: ${registrationUrl}`);
  console.log(`  Submission URL: ${submissionUrl}`);
  console.log(`  CCOP Token: 0xdAC17F958D2ee523a2206206994597C13D831ec7 (hardcoded)`);

  // Load contract artifact
  const { abi, bytecode } = loadContractArtifact();
  console.log(`\nContract bytecode loaded (${bytecode.length} bytes)`);

  // Deploy contract with 7 constructor arguments
  console.log(`\nDeploying V2 contract...`);

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    account,
    chain: walletClient.chain,
    args: [
      verifierAddress,
      imageId,
      notaryKeyFingerprint,
      registrationQueriesHash,
      submissionQueriesHash,
      registrationUrl,
      submissionUrl,
    ],
  });

  console.log(`\nTransaction hash: ${hash}`);
  console.log(`Waiting for confirmation...`);

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error('Contract deployment failed - no contract address in receipt');
  }

  console.log(`\n✓ V2 Contract deployed successfully!`);
  console.log(`  Address: ${receipt.contractAddress}`);
  console.log(`  Block: ${receipt.blockNumber}`);
  console.log(`  Gas used: ${receipt.gasUsed}`);

  // Save deployment info
  const deploymentInfo = {
    network,
    version: 'v2',
    chainId: networkConfig.chain.id,
    contractAddress: receipt.contractAddress,
    deployer: account.address,
    transactionHash: hash,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toString(),
    timestamp: Date.now(),
    parameters: {
      verifierAddress,
      imageId,
      notaryKeyFingerprint,
      registrationQueriesHash,
      submissionQueriesHash,
      registrationUrl,
      submissionUrl,
      ccopAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    },
  };

  const deploymentPath = path.join(__dirname, '../deployments', `${network}-v2.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentPath}`);

  // Verify contract if requested
  if (verify) {
    console.log(`\n=== Contract Verification ===`);
    console.log(`To verify on block explorer, run:`);
    console.log(`forge verify-contract ${receipt.contractAddress} TikTokCampaignVerifierV2 --chain ${network} --watch`);
    console.log(`\nOr use the verify script:`);
    console.log(`npm run verify ${network} ${receipt.contractAddress}`);
  }

  return {
    address: receipt.contractAddress,
    transactionHash: hash,
    deploymentInfo,
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(`
Usage: npm run deploy-v2 <network> [verifierAddress] [--verify]

Networks:
  mainnet, sepolia, base, base-sepolia, optimism, opSepolia,
  arbitrum, arbitrumSepolia

Options:
  --verify    Request contract verification after deployment

V2 Required Environment Variables:
  ZK_PROVER_GUEST_ID
  NOTARY_KEY_FINGERPRINT
  REGISTRATION_QUERIES_HASH
  SUBMISSION_QUERIES_HASH
  REGISTRATION_URL
  SUBMISSION_URL

Note: CCOP token address is hardcoded as 0xdAC17F958D2ee523a2206206994597C13D831ec7

Examples:
  npm run deploy-v2 sepolia                      # deploys mock verifier first
  npm run deploy-v2 base 0x... --verify          # uses provided verifier
`);
    process.exit(1);
  }

  const network = args[0];
  const shouldVerify = args.includes('--verify');
  const potentialAddressArg = args.find((a) => a.startsWith('0x') && a.length === 42);

  // Safety check for mainnet deployments
  if (['mainnet', 'base', 'optimism', 'arbitrum'].includes(network)) {
    console.log(`\n⚠️  WARNING: You are about to deploy to ${network.toUpperCase()} MAINNET!`);
    console.log(`This will cost real money and cannot be undone.\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise<void>((resolve) => {
      rl.question('Type "yes" to continue: ', (answer: string) => {
        rl.close();
        if (answer.toLowerCase() !== 'yes') {
          console.log('Deployment cancelled.');
          process.exit(0);
        }
        resolve();
      });
    });
  }

  try {
    const result = await deploy({
      network,
      verify: shouldVerify,
      verifierAddress: potentialAddressArg as Hex | undefined,
    });

    console.log(`\n=== V2 Deployment Complete ===`);
    console.log(`Contract Address: ${result.address}`);
    console.log(`Transaction: ${result.transactionHash}`);
    console.log(`\nNext steps:`);
    if (network.toLowerCase() === 'anvil') {
      console.log(`1. Update your .env with: NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS_V2=${result.address}`);
    } else {
      const prefix = network.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      console.log(`1. Update your .env with: NEXT_PUBLIC_${prefix}_CONTRACT_ADDRESS_V2=${result.address}`);
    }
    console.log(`2. Test registration: Call register() with registration proof`);
    console.log(`3. Advance state: Call advanceState() to move to WaitingForProofs`);
    console.log(`4. Test submission: Call submitCampaign() with submission proof`);
    console.log(`5. Advance state: Call advanceState() to move to Claimable`);
    console.log(`6. Test claim: Call claimReward() to claim WETH rewards`);
    if (!shouldVerify) {
      console.log(`7. Verify contract code in blockchain explorer: npm run verify ${network} ${result.address}`);
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n✗ V2 Deployment failed:`, message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { deploy, type DeployOptions };
