"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { TikTokCampaignVerifierV2Abi } from "../lib/abi";
import type { RegistrationProof } from "../lib/types";

export function useRegisterOnChain(contractAddress?: `0x${string}`) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerTxHash, setRegisterTxHash] = useState<`0x${string}` | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Submit registration to blockchain
  async function submitRegistration(proof: RegistrationProof): Promise<`0x${string}` | null> {
    if (!contractAddress) {
      setError('Contract address not configured');
      return null;
    }

    if (!proof || !proof.zkProof || !proof.journalDataAbi) {
      setError('Invalid registration proof');
      return null;
    }

    setIsRegistering(true);
    setError(null);
    setRegisterTxHash(null);

    try {
      console.log('Submitting registration to contract:', {
        contractAddress,
        handle: proof.registrationData.handleTiktok,
        campaignId: proof.registrationData.campaignId,
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'register',
        args: [proof.journalDataAbi, proof.zkProof],
      });

      setRegisterTxHash(hash);
      console.log('Registration transaction submitted:', hash);

      // Wait for transaction confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Registration confirmed in block:', receipt.blockNumber);
      }

      return hash;
    } catch (err: any) {
      console.error('Error submitting registration:', err);

      // Parse common errors
      let errorMessage = err?.message || 'Failed to submit registration';

      if (errorMessage.includes('AlreadyRegistered')) {
        errorMessage = 'This handle is already registered';
      } else if (errorMessage.includes('InvalidState')) {
        errorMessage = 'Campaign is not in Registration state';
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
      }

      setError(errorMessage);
      return null;
    } finally {
      setIsRegistering(false);
    }
  }

  // Check if a handle is already registered
  async function checkRegistration(handle: string): Promise<boolean> {
    if (!contractAddress || !publicClient || !handle) return false;

    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'isRegistered',
        args: [handle],
      }) as boolean;

      return result;
    } catch (err: any) {
      console.error('Error checking registration:', err);
      return false;
    }
  }

  // Get all registered handles
  async function getRegisteredHandles(): Promise<string[]> {
    if (!contractAddress || !publicClient) return [];

    try {
      const handles = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'getRegisteredHandles',
      }) as string[];

      return handles;
    } catch (err: any) {
      console.error('Error getting registered handles:', err);
      return [];
    }
  }

  // Get total registered count
  async function getTotalRegistered(): Promise<bigint> {
    if (!contractAddress || !publicClient) return BigInt(0);

    try {
      const total = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'totalRegistered',
      }) as bigint;

      return total;
    } catch (err: any) {
      console.error('Error getting total registered:', err);
      return BigInt(0);
    }
  }

  return {
    // State
    isRegistering,
    error,
    registerTxHash,
    setError,

    // Actions
    submitRegistration,
    checkRegistration,
    getRegisteredHandles,
    getTotalRegistered,
  } as const;
}
