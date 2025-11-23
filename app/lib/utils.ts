import { decodeAbiParameters, type Hex } from "viem";

export function parseOwnerRepo(input: string): { owner: string; name: string } {
  const urlStr = (input || "").trim();
  const ownerRepoFromApi = urlStr.match(/\/repos\/([^/]+)\/([^/]+)\b/i);
  const ownerRepoFromGit = urlStr.match(/github\.com\/([^/]+)\/([^/]+)\b/i);
  const ownerRepoFromPlain = urlStr.match(/^([^/]+)\/([^/]+)$/);

  const owner = (ownerRepoFromApi?.[1] || ownerRepoFromGit?.[1] || ownerRepoFromPlain?.[1] || "").trim();
  const name = (ownerRepoFromApi?.[2] || ownerRepoFromGit?.[2] || ownerRepoFromPlain?.[2] || "").trim();
  return { owner, name };
}


export function extractContributionData(graphLike: unknown): { username: string; total: number } | null {
  const body = (graphLike as any)?.response?.body ?? graphLike;
  let graph: any = null;
  if (typeof body === "string") {
    try {
      graph = JSON.parse(body);
    } catch {
      return null;
    }
  } else if (body && typeof body === "object") {
    graph = body;
  }
  const userLogin = graph?.data?.user?.login;
  const mergedCount = graph?.data?.mergedPRs?.issueCount;
  if (typeof userLogin === "string" && typeof mergedCount === "number") {
    return { username: userLogin, total: mergedCount };
  }
  return null;
}


/**
 * V2: Decode REGISTRATION journalDataAbi
 * Format: (bytes32 notaryKeyFingerprint, string method, string url, uint256 timestamp, bytes32 queriesHash, string campaignId, string handleTiktok)
 */
export function decodeRegistrationJournalData(journalDataAbi: Hex) {
  try {
    const decoded = decodeAbiParameters(
      [
        { type: "bytes32", name: "notaryKeyFingerprint" },
        { type: "string", name: "method" },
        { type: "string", name: "url" },
        { type: "uint256", name: "timestamp" },
        { type: "bytes32", name: "queriesHash" },
        { type: "string", name: "campaignId" },
        { type: "string", name: "handleTiktok" },
      ],
      journalDataAbi
    );

    return {
      notaryKeyFingerprint: decoded[0] as Hex,
      method: decoded[1] as string,
      url: decoded[2] as string,
      timestamp: Number(decoded[3]),
      queriesHash: decoded[4] as Hex,
      campaignId: decoded[5] as string,
      handleTiktok: decoded[6] as string,
    };
  } catch (error) {
    console.error("Failed to decode registration journalDataAbi:", error);
    throw new Error("Invalid registration journalDataAbi format");
  }
}

/**
 * V2: Decode SUBMISSION journalDataAbi
 * Format: (bytes32 notaryKeyFingerprint, string method, string url, uint256 timestamp, bytes32 queriesHash, string campaignId, string handleTiktok, uint256 scoreCalidad, string urlVideo)
 */
export function decodeSubmissionJournalData(journalDataAbi: Hex) {
  try {
    const decoded = decodeAbiParameters(
      [
        { type: "bytes32", name: "notaryKeyFingerprint" },
        { type: "string", name: "method" },
        { type: "string", name: "url" },
        { type: "uint256", name: "timestamp" },
        { type: "bytes32", name: "queriesHash" },
        { type: "string", name: "campaignId" },
        { type: "string", name: "handleTiktok" },
        { type: "uint256", name: "scoreCalidad" },
        { type: "string", name: "urlVideo" },
      ],
      journalDataAbi
    );

    return {
      notaryKeyFingerprint: decoded[0] as Hex,
      method: decoded[1] as string,
      url: decoded[2] as string,
      timestamp: Number(decoded[3]),
      queriesHash: decoded[4] as Hex,
      campaignId: decoded[5] as string,
      handleTiktok: decoded[6] as string,
      scoreCalidad: decoded[7] as bigint,
      urlVideo: decoded[8] as string,
    };
  } catch (error) {
    console.error("Failed to decode submission journalDataAbi:", error);
    throw new Error("Invalid submission journalDataAbi format");
  }
}

/**
 * V1 Compatibility: Decode journalDataAbi (alias for submission)
 */
export function decodeJournalData(journalDataAbi: Hex) {
  return decodeSubmissionJournalData(journalDataAbi);
}


