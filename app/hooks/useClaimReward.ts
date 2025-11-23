"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { TikTokCampaignVerifierV2Abi } from "../lib/abi";
import { formatEther } from "viem";

export function useClaimReward(contractAddress?: `0x${string}`) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCheckingReward, setIsCheckingReward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Check if handle has claimed
  async function hasClaimed(handle: string): Promise<boolean> {
    if (!contractAddress || !publicClient || !handle) return false;

    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'hasClaimed',
        args: [handle],
      }) as boolean;

      return result;
    } catch (err: any) {
      console.error('Error checking claim status:', err);
      return false;
    }
  }

  // Get claimable reward amount
  async function getRewardAmount(handle: string): Promise<{
    amount: bigint;
    formattedAmount: string;
  } | null> {
    if (!contractAddress || !publicClient || !handle) return null;

    setIsCheckingReward(true);
    setError(null);

    try {
      const amount = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'getRewardAmount',
        args: [handle],
      }) as bigint;

      return {
        amount,
        formattedAmount: formatEther(amount),
      };
    } catch (err: any) {
      console.error('Error getting reward amount:', err);
      setError(err?.message || 'Failed to get reward amount');
      return null;
    } finally {
      setIsCheckingReward(false);
    }
  }

  // Claim reward
  async function claimReward(handle: string): Promise<`0x${string}` | null> {
    if (!contractAddress) {
      setError('Contract address not configured');
      return null;
    }

    if (!handle || !handle.trim()) {
      setError('TikTok handle is required');
      return null;
    }

    setIsClaiming(true);
    setError(null);
    setClaimTxHash(null);

    try {
      // First check if already claimed
      const claimed = await hasClaimed(handle);
      if (claimed) {
        setError('Reward already claimed for this handle');
        setIsClaiming(false);
        return null;
      }

      // Check reward amount
      const reward = await getRewardAmount(handle);
      if (!reward || reward.amount === BigInt(0)) {
        setError('No rewards available to claim');
        setIsClaiming(false);
        return null;
      }

      // Submit claim transaction
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'claimReward',
        args: [handle],
      });

      setClaimTxHash(hash);

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      return hash;
    } catch (err: any) {
      console.error('Error claiming reward:', err);

      // Parse common errors
      let errorMessage = err?.message || 'Failed to claim reward';

      if (errorMessage.includes('AlreadyClaimed')) {
        errorMessage = 'Reward already claimed for this handle';
      } else if (errorMessage.includes('NoRewardsAvailable')) {
        errorMessage = 'No rewards available to claim';
      } else if (errorMessage.includes('InvalidState')) {
        errorMessage = 'Campaign must be in Claimable state to claim rewards';
      } else if (errorMessage.includes('NotRegistered')) {
        errorMessage = 'Handle is not registered in this campaign';
      }

      setError(errorMessage);
      return null;
    } finally {
      setIsClaiming(false);
    }
  }

  // Get score for handle (needed to calculate reward share)
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

  // Get total campaign score (for calculating percentage)
  async function getTotalScore(): Promise<bigint | null> {
    if (!contractAddress || !publicClient) return null;

    try {
      const total = await publicClient.readContract({
        address: contractAddress,
        abi: TikTokCampaignVerifierV2Abi,
        functionName: 'totalScore',
      }) as bigint;

      return total;
    } catch (err: any) {
      console.error('Error getting total score:', err);
      return null;
    }
  }

  // Calculate reward percentage
  async function getRewardPercentage(handle: string): Promise<number | null> {
    const score = await getHandleScore(handle);
    const total = await getTotalScore();

    if (!score || !total || total === BigInt(0)) return null;

    const percentage = (Number(score) / Number(total)) * 100;
    return percentage;
  }

  return {
    // State
    isClaiming,
    isCheckingReward,
    isLoading: isClaiming || isCheckingReward,
    error,
    claimTxHash,
    setError,

    // Actions
    claimReward,
    getRewardAmount,
    hasClaimed,
    getHandleScore,
    getTotalScore,
    getRewardPercentage,
  } as const;
}
