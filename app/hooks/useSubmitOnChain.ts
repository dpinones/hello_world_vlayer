"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { TikTokCampaignVerifierV2Abi } from "../lib/abi";
import type { SubmissionProof } from "../lib/types";

export function useSubmitOnChain(contractAddress?: `0x${string}`) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitTxHash, setSubmitTxHash] = useState<`0x${string}` | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Submit campaign proof to blockchain
  async function submitCampaignProof(proof: SubmissionProof): Promise<`0x${string}` | null> {
    if (!contractAddress) {
      setError('Contract address not configured');
      return null;
    }

    if (!proof || !proof.zkProof || !proof.journalDataAbi) {
      setError('Invalid submission proof');
      return null;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitTxHash(null);

    try {
      console.log('Submitting campaign proof to contract:', {
        contractAddress,
        handle: proof.submissionData.handleTiktok,
        campaignId: proof.submissionData.campaignId,
        score: proof.submissionData.scoreCalidad,
        videoUrl: proof.submissionData.urlVideo,
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'submitVideo',
        args: [proof.journalDataAbi, proof.zkProof],
        gas: BigInt(500000),
      });

      setSubmitTxHash(hash);
      console.log('Submission transaction submitted:', hash);

      // Wait for transaction confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Submission confirmed in block:', receipt.blockNumber);
      }

      return hash;
    } catch (err: any) {
      console.error('Error submitting campaign proof:', err);

      // Parse common errors
      let errorMessage = err?.message || 'Failed to submit campaign proof';

      if (errorMessage.includes('NotRegistered')) {
        errorMessage = 'Handle must be registered before submitting proof';
      } else if (errorMessage.includes('AlreadySubmitted')) {
        errorMessage = 'This handle has already submitted a proof';
      } else if (errorMessage.includes('InvalidState')) {
        errorMessage = 'Campaign is not in WaitingForProofs state';
      } else if (errorMessage.includes('InvalidNotaryKeyFingerprint')) {
        errorMessage = 'Invalid TLS notary key fingerprint';
      } else if (errorMessage.includes('InvalidQueriesHash')) {
        errorMessage = 'Invalid queries hash - proof may be from wrong API';
      } else if (errorMessage.includes('ZKProofVerificationFailed')) {
        errorMessage = 'ZK proof verification failed';
      } else if (errorMessage.includes('InvalidHandle')) {
        errorMessage = 'Invalid TikTok handle';
      } else if (errorMessage.includes('InvalidCampaignId')) {
        errorMessage = 'Invalid campaign ID';
      } else if (errorMessage.includes('InvalidScore')) {
        errorMessage = 'Invalid score value';
      } else if (errorMessage.includes('InvalidUrl')) {
        errorMessage = 'Invalid video URL';
      }

      setError(errorMessage);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get score for a handle
  async function getHandleScore(handle: string): Promise<bigint | null> {
    if (!contractAddress || !publicClient || !handle) return null;

    try {
      const score = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'scoresByHandle',
        args: [handle],
      }) as bigint;

      return score;
    } catch (err: any) {
      console.error('Error getting score:', err);
      return null;
    }
  }

  // Get total submitted count
  async function getTotalSubmitted(): Promise<bigint> {
    if (!contractAddress || !publicClient) return BigInt(0);

    try {
      const total = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'totalSubmitted',
      }) as bigint;

      return total;
    } catch (err: any) {
      console.error('Error getting total submitted:', err);
      return BigInt(0);
    }
  }

  // Get total score across all submissions
  async function getTotalScore(): Promise<bigint> {
    if (!contractAddress || !publicClient) return BigInt(0);

    try {
      const total = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'totalScore',
      }) as bigint;

      return total;
    } catch (err: any) {
      console.error('Error getting total score:', err);
      return BigInt(0);
    }
  }

  return {
    // State
    isSubmitting,
    error,
    submitTxHash,
    setError,

    // Actions
    submitCampaignProof,
    getHandleScore,
    getTotalSubmitted,
    getTotalScore,
  } as const;
}
