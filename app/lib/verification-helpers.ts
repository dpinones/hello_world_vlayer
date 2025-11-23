import { type PublicClient, type Address, decodeErrorResult } from "viem";
import { GitHubContributionVerifierAbi } from "./abi";
import { parseOwnerRepo, decodeJournalData } from "./utils";

export type DecodedJournalData = ReturnType<typeof decodeJournalData>;

/**
 * Attempts to decode the error from a reverted transaction
 */
export async function decodeTransactionError(params: {
  publicClient: PublicClient;
  hash: `0x${string}`;
  contractAddress: Address;
  journalData: `0x${string}`;
  seal: `0x${string}`;
  accountAddress: Address;
}): Promise<{ errorMessage: string; errorName: string }> {
  let errorMessage = "Transaction reverted on-chain";
  let errorName = "UnknownError";

  try {
    const tx = await params.publicClient.getTransaction({ hash: params.hash });
    if (!tx.from || !tx.to || !params.accountAddress) {
      return { errorMessage, errorName };
    }

    try {
      await params.publicClient.simulateContract({
        address: params.contractAddress,
        abi: GitHubContributionVerifierAbi,
        functionName: "submitVideo" as any, // Updated from submitContribution
        args: [params.journalData, params.seal],
        account: params.accountAddress,
      });
    } catch (simError: any) {
      const revertData =
        (simError as { data?: string })?.data ||
        (simError as { cause?: { data?: string } })?.cause?.data;

      if (revertData && typeof revertData === "string" && revertData.startsWith("0x")) {
        try {
          const decoded = decodeErrorResult({
            abi: GitHubContributionVerifierAbi,
            data: revertData as `0x${string}`,
          });
          errorName = decoded.errorName;
          errorMessage = `Transaction reverted: ${decoded.errorName}`;
        } catch {
          errorMessage = "Transaction reverted (unable to decode error)";
        }
      } else {
        const msg = (simError as Error)?.message || String(simError);
        if (msg.includes("revert") || msg.includes("Revert")) {
          errorMessage = msg;
        }
      }
    }
  } catch {
    errorMessage = "Transaction reverted (unable to decode error)";
  }

  return { errorMessage, errorName };
}

/**
 * Gets the handle for redirect (TikTok handle or video URL)
 */
export function getRepoForRedirect(
  decoded: DecodedJournalData,
  inputUrl: string
): string {
  // For TikTok, return the handle or video URL
  if (decoded.handleTiktok) {
    return decoded.handleTiktok;
  }

  if (decoded.urlVideo) {
    return decoded.urlVideo;
  }

  return inputUrl || "";
}

/**
 * Builds query parameters for error page redirect
 */
export function buildErrorRedirectParams(params: {
  txHash: `0x${string}`;
  chainId: number;
  errorMessage: string;
  errorName: string;
  decoded: DecodedJournalData;
  inputUrl: string;
  contractAddress: string;
}): URLSearchParams {
  const handleForRedirect = getRepoForRedirect(params.decoded, params.inputUrl);

  return new URLSearchParams({
    txHash: params.txHash,
    chainId: String(params.chainId),
    error: params.errorMessage,
    errorName: params.errorName,
    handle: params.decoded.handleTiktok || '',
    videoUrl: params.decoded.urlVideo || handleForRedirect,
    score: String(params.decoded.scoreCalidad || 0),
    contractAddress: params.contractAddress,
  });
}

/**
 * Builds query parameters for success page redirect
 */
export function buildSuccessRedirectParams(params: {
  decoded: DecodedJournalData;
  chainId: number;
  inputUrl: string;
  txHash: `0x${string}`;
}): URLSearchParams {
  const handleForRedirect = getRepoForRedirect(params.decoded, params.inputUrl);

  return new URLSearchParams({
    handle: params.decoded.handleTiktok || '',
    chainId: String(params.chainId),
    videoUrl: params.decoded.urlVideo || handleForRedirect,
    score: String(params.decoded.scoreCalidad || 0),
    txHash: params.txHash,
  });
}

/**
 * Gets the contract address from environment variables based on chain ID
 */
export function getContractAddressFromEnv(chainId: number): string {
  if (chainId === 31337) {
    // anvil
    return process.env.NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS || "";
  } else if (chainId === 11155111) {
    // sepolia
    return process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS || "";
  } else if (chainId === 84532) {
    // baseSepolia
    return process.env.NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS || "";
  } else if (chainId === 11155420) {
    // optimismSepolia
    return process.env.NEXT_PUBLIC_OP_SEPOLIA_CONTRACT_ADDRESS || "";
  }
  return "";
}

