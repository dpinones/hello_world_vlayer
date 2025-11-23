"use client";

import { useState, useEffect } from "react";
import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TikTokCampaignVerifierV2Abi } from "../lib/abi";
import { CampaignState } from "../lib/types";

interface CampaignStats {
  registered: bigint;
  submitted: bigint;
  totalScore: bigint;
  state: CampaignState;
}

export function useCampaignState(contractAddress?: `0x${string}`) {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Fetch campaign stats
  async function refreshCampaignState() {
    if (!contractAddress || !publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'getCampaignStats',
      }) as [bigint, bigint, bigint, number];

      setStats({
        registered: result[0],
        submitted: result[1],
        totalScore: result[2],
        state: result[3] as CampaignState,
      });
    } catch (err: any) {
      console.error('Error fetching campaign stats:', err);
      setError(err?.message || 'Failed to fetch campaign stats');
    } finally {
      setIsLoading(false);
    }
  }

  // Advance campaign state
  async function advanceState() {
    if (!contractAddress) {
      setError('Contract address not configured');
      return null;
    }

    setError(null);

    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'advanceState',
      });

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      // Refresh stats after state change
      await refreshCampaignState();

      return hash;
    } catch (err: any) {
      console.error('Error advancing state:', err);
      setError(err?.message || 'Failed to advance state');
      return null;
    }
  }

  // Get current state only
  async function getCurrentState(): Promise<CampaignState | null> {
    if (!contractAddress || !publicClient) return null;

    try {
      const state = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'currentState',
      }) as number;

      return state as CampaignState;
    } catch (err: any) {
      console.error('Error getting current state:', err);
      return null;
    }
  }

  // Check if handle is registered
  async function isHandleRegistered(handle: string): Promise<boolean> {
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

  // Get score for handle
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

  // Auto-refresh on mount
  useEffect(() => {
    if (contractAddress) {
      refreshCampaignState();
    }
  }, [contractAddress]);

  return {
    // State
    stats,
    currentState: stats?.state ?? null,
    isLoading,
    error,
    setError,

    // Actions
    refreshCampaignState,
    advanceState,
    getCurrentState,
    isHandleRegistered,
    getHandleScore,
  } as const;
}

// Helper function to get state name
export function getStateName(state: CampaignState | null): string {
  if (state === null) return 'Unknown';

  switch (state) {
    case CampaignState.Registration:
      return 'Registration';
    case CampaignState.WaitingForProofs:
      return 'Waiting for Proofs';
    case CampaignState.Claimable:
      return 'Claimable';
    default:
      return 'Unknown';
  }
}

// Helper function to check if action is allowed in current state
export function canRegister(state: CampaignState | null): boolean {
  return state === CampaignState.Registration;
}

export function canSubmitProof(state: CampaignState | null): boolean {
  return state === CampaignState.WaitingForProofs;
}

export function canClaimReward(state: CampaignState | null): boolean {
  return state === CampaignState.Claimable;
}
