import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { GitHubContributionVerifierAbi } from '../../app/lib/abi';
import { decodeJournalData } from '../../app/lib/utils';
import { contractsDir, projectRoot } from '../helpers/env';
import { getAvailablePort, waitForServer } from '../helpers/network';
import { ManagedProcess, runCommand, startProcess, stopProcess, waitForOutput } from '../helpers/process';
const DEFAULT_ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CONTRIBUTIONS_GETTER_ABI = [
  {
    type: 'function',
    name: 'contributionsByRepoAndUser',
    stateMutability: 'view',
    inputs: [
      { name: 'repoNameWithOwner', type: 'string' },
      { name: 'username', type: 'string' },
    ],
    outputs: [{ name: 'contributions', type: 'uint256' }],
  },
] as const;
const deploymentsPath = path.join(contractsDir, 'deployments', 'anvil.json');

describe('vlayer web proof e2e', () => {
  const ctx: {
    anvil?: ManagedProcess;
    next?: ManagedProcess;
    anvilRpcUrl?: string;
    nextPort?: number;
    contractAddress?: string;
    githubToken?: string;
    imageId?: string;
    proverEnv?: {
      baseUrl?: string;
      clientId: string;
      secret: string;
    };
    zkProverUrl?: string;
  } = {};

  beforeAll(async () => {
    console.log('[SETUP] Iniciando configuración del test...');

    console.log('[SETUP] Verificando variables de entorno...');
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_GRAPHQL_TOKEN;
    if (!githubToken) {
      throw new Error('Set GITHUB_TOKEN (or GITHUB_GRAPHQL_TOKEN) for the GitHub GraphQL API call');
    }
    console.log('[SETUP] ✓ GitHub token encontrado');

    const proverClientId = process.env.WEB_PROVER_API_CLIENT_ID;
    const proverSecret = process.env.WEB_PROVER_API_SECRET;
    if (!proverClientId || !proverSecret) {
      throw new Error('Set WEB_PROVER_API_CLIENT_ID and WEB_PROVER_API_SECRET to reach the vlayer Web Prover API');
    }
    console.log('[SETUP] ✓ Web Prover API credentials encontradas');

    ctx.githubToken = githubToken;
    ctx.proverEnv = {
      baseUrl: process.env.WEB_PROVER_API_URL,
      clientId: proverClientId,
      secret: proverSecret,
    };
    ctx.zkProverUrl = process.env.ZK_PROVER_API_URL || 'https://zk-prover.vlayer.xyz/api/v0';
    console.log('[SETUP] ZK Prover URL:', ctx.zkProverUrl);

    ctx.imageId = process.env.ZK_PROVER_GUEST_ID
    if (!ctx.imageId) {
      throw new Error('ZK_PROVER_GUEST_ID not set');
    }
    console.log('[SETUP] ZK_PROVER_GUEST_ID:', ctx.imageId);

    console.log('[SETUP] Obteniendo puerto disponible para Anvil...');
    const anvilPort = await getAvailablePort();
    ctx.anvilRpcUrl = `http://127.0.0.1:${anvilPort}`;
    console.log('[SETUP] ✓ Puerto Anvil:', anvilPort);

    console.log('[SETUP] Iniciando Anvil...');
    ctx.anvil = startProcess(
      'anvil',
      ['--host', '127.0.0.1', '--port', String(anvilPort), '--chain-id', '31337'],
      'anvil',
      { cwd: projectRoot }
    );
    await waitForOutput(ctx.anvil, /Listening on/);
    console.log('[SETUP] ✓ Anvil iniciado y escuchando');

    console.log('[SETUP] Compilando contratos...');
    await runCommand('forge', ['build'], { cwd: contractsDir });
    console.log('[SETUP] ✓ Contratos compilados');

    console.log('[SETUP] Desplegando contrato en Anvil...');
    await runCommand(
      'npm',
      ['run', 'deploy:anvil'],
      {
        cwd: contractsDir,
        env: {
          ...process.env,
          PRIVATE_KEY: DEFAULT_ANVIL_PRIVATE_KEY,
          NOTARY_KEY_FINGERPRINT: '0xa7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af',
          QUERIES_HASH: '0x85db70a06280c1096181df15a8c754a968a0eb669b34d686194ce1faceb5c6c6',
          EXPECTED_URL: 'https://api.github.com/graphql',
          ANVIL_RPC_URL: ctx.anvilRpcUrl,
        },
      }
    );
    console.log('[SETUP] ✓ Contrato desplegado');

    const deployment = JSON.parse(await readFile(deploymentsPath, 'utf-8'));
    ctx.contractAddress = deployment.contractAddress;
    console.log('[SETUP] Contract Address:', ctx.contractAddress);

    console.log('[SETUP] Obteniendo puerto disponible para Next.js...');
    ctx.nextPort = await getAvailablePort();
    console.log('[SETUP] ✓ Puerto Next.js:', ctx.nextPort);

    console.log('[SETUP] Iniciando servidor Next.js...');
    ctx.next = startProcess(
      'npx',
      ['--no-install', 'next', 'dev', '-H', '127.0.0.1', '-p', String(ctx.nextPort)],
      'next',
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          PORT: String(ctx.nextPort),
          WEB_PROVER_API_URL: ctx.proverEnv.baseUrl,
          WEB_PROVER_API_CLIENT_ID: ctx.proverEnv.clientId,
          WEB_PROVER_API_SECRET: ctx.proverEnv.secret,
          ZK_PROVER_API_URL: ctx.zkProverUrl,
          NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS: ctx.contractAddress,
        },
      }
    );

    await waitForOutput(ctx.next, /Ready in/i, 120_000);
    await waitForServer(`http://127.0.0.1:${ctx.nextPort}`, 60_000);
    console.log('[SETUP] ✓ Servidor Next.js listo');
    console.log('[SETUP] ✓ Configuración completa');
  }, 180_000);

  afterAll(async () => {
    console.log('\n[CLEANUP] Deteniendo procesos...');
    console.log('[CLEANUP] Deteniendo Next.js...');
    await stopProcess(ctx.next);
    console.log('[CLEANUP] ✓ Next.js detenido');

    console.log('[CLEANUP] Deteniendo Anvil...');
    await stopProcess(ctx.anvil);
    console.log('[CLEANUP] ✓ Anvil detenido');
    console.log('[CLEANUP] ✓ Limpieza completa\n');
  });

  test('prove, compress, and submit contribution on-chain', async () => {
    console.log('\n[TEST] ======== INICIANDO TEST ========');

    if (!ctx.nextPort || !ctx.githubToken || !ctx.anvilRpcUrl || !ctx.contractAddress) {
      throw new Error('Test context not initialized');
    }

    const login = process.env.GITHUB_LOGIN || 'Chmarusso';
    const owner = process.env.GITHUB_REPO_OWNER || 'vlayer-xyz';
    const repoName = process.env.GITHUB_REPO_NAME || 'vlayer';

    console.log('[TEST] Configuración del test:');
    console.log('  - Usuario GitHub:', login);
    console.log('  - Owner:', owner);
    console.log('  - Repositorio:', repoName);
    console.log('  - Contract Address:', ctx.contractAddress);
    console.log('  - Next.js Port:', ctx.nextPort);

    const query = `query($login: String!, $owner: String!, $name: String!, $q: String!) {
        repository(owner: $owner, name: $name) { name nameWithOwner owner { login } }
        mergedPRs: search(type: ISSUE, query: $q) { issueCount }
        user(login: $login) { login }
      }`;

    console.log('\n[TEST] Paso 1: Llamando a /api/prove...');
    console.log('[TEST] URL:', `http://127.0.0.1:${ctx.nextPort}/api/prove`);
    console.log('[TEST] Query variables:', {
      login,
      owner,
      name: repoName,
      q: `repo:${owner}/${repoName} is:pr is:merged author:${login}`,
    });

    const proveResponse = await fetch(`http://127.0.0.1:${ctx.nextPort}/api/prove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          login,
          owner,
          name: repoName,
          q: `repo:${owner}/${repoName} is:pr is:merged author:${login}`,
        },
        githubToken: ctx.githubToken,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    console.log('[TEST] Status de /api/prove:', proveResponse.status);
    expect(proveResponse.status).toBe(200);

    const presentation = await proveResponse.json();
    console.log('[TEST] ✓ Presentation recibida:', JSON.stringify(presentation, null, 2));
    expect(typeof presentation).toBe('object');
    expect(presentation).not.toHaveProperty('error');

    console.log('\n[TEST] Paso 2: Llamando a /api/compress...');
    console.log('[TEST] URL:', `http://127.0.0.1:${ctx.nextPort}/api/compress`);
    console.log('[TEST] Username:', login);

    const compressResponse = await fetch(`http://127.0.0.1:${ctx.nextPort}/api/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentation, username: login }),
      signal: AbortSignal.timeout(60_000),
    });

    console.log('[TEST] Status de /api/compress:', compressResponse.status);
    expect(compressResponse.status).toBe(200);

    const compressionPayload = await compressResponse.json();
    console.log('[TEST] ✓ Compression payload recibido:', JSON.stringify(compressionPayload, null, 2));

    const zkProof = compressionPayload.success ? compressionPayload.data.zkProof : compressionPayload.zkProof;
    const journalDataAbi = compressionPayload.success ? compressionPayload.data.journalDataAbi : compressionPayload.journalDataAbi;

    console.log('[TEST] zkProof presente:', !!zkProof);
    console.log('[TEST] journalDataAbi presente:', !!journalDataAbi);

    if (!zkProof || !journalDataAbi) {
      throw new Error('Compression response missing zkProof or journalDataAbi');
    }

    const decoded = decodeJournalData(journalDataAbi as `0x${string}`);
    const journalData = journalDataAbi as `0x${string}`;
    const seal = zkProof as `0x${string}`;

    console.log('\n[TEST] Paso 3: Journal data decodificado:');
    console.log('  - Repo:', decoded.repo);
    console.log('  - Username:', decoded.username);
    console.log('  - Contributions:', decoded.contributions.toString());

    console.log('\n[TEST] Paso 4: Configurando clientes de blockchain...');
    const configuredFoundry = {
      ...foundry,
      rpcUrls: {
        default: { http: [ctx.anvilRpcUrl] },
        public: { http: [ctx.anvilRpcUrl] },
      },
    } as const;

    const account = privateKeyToAccount(DEFAULT_ANVIL_PRIVATE_KEY);
    console.log('[TEST] ✓ Cuenta configurada:', account.address);

    const walletClient = createWalletClient({
      account,
      chain: configuredFoundry,
      transport: http(ctx.anvilRpcUrl),
    });
    const publicClient = createPublicClient({
      chain: configuredFoundry,
      transport: http(ctx.anvilRpcUrl),
    });
    console.log('[TEST] ✓ Clientes de viem creados');

    console.log('\n[TEST] Paso 5: Enviando transacción a blockchain...');
    console.log('[TEST] Contract Address:', ctx.contractAddress);
    console.log('[TEST] Function:', 'submitContribution');
    console.log('[TEST] Args - journalData length:', journalData.length);
    console.log('[TEST] Args - seal length:', seal.length);

    const hash = await walletClient.writeContract({
      address: ctx.contractAddress as `0x${string}`,
      abi: GitHubContributionVerifierAbi,
      functionName: 'submitContribution',
      args: [journalData, seal],
    });
    console.log('[TEST] ✓ Transacción enviada, hash:', hash);

    console.log('[TEST] Esperando recibo de transacción...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('[TEST] ✓ Recibo recibido, status:', receipt.status);
    console.log('[TEST] Gas usado:', receipt.gasUsed.toString());
    expect(receipt.status).toBe('success');

    console.log('\n[TEST] Paso 6: Verificando datos guardados en el contrato...');
    const stored = await publicClient.readContract({
      address: ctx.contractAddress as `0x${string}`,
      abi: CONTRIBUTIONS_GETTER_ABI,
      functionName: 'contributionsByRepoAndUser',
      args: [decoded.repo, decoded.username],
    });
    console.log('[TEST] Contributions almacenadas:', stored.toString());
    console.log('[TEST] Contributions esperadas:', decoded.contributions.toString());
    expect(stored).toBe(decoded.contributions);

    console.log('\n[TEST] ======== TEST COMPLETADO EXITOSAMENTE ========\n');
  });
});
