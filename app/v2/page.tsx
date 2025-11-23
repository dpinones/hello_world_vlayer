"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useCampaignState, getStateName, canRegister, canSubmitProof, canClaimReward } from "../hooks/useCampaignState";
import { useRegistration } from "../hooks/useRegistration";
import { useRegisterOnChain } from "../hooks/useRegisterOnChain";
import { useSubmission } from "../hooks/useSubmission";
import { useSubmitOnChain } from "../hooks/useSubmitOnChain";
import { useClaimReward } from "../hooks/useClaimReward";
import { CampaignState } from "../lib/types";

export default function CampaignV2Page() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const contractAddress = process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS as `0x${string}`;

  // Campaign state management
  const {
    stats,
    currentState,
    isLoading: isLoadingState,
    error: stateError,
    refreshCampaignState,
    advanceState,
    isHandleRegistered,
  } = useCampaignState(contractAddress);

  // Registration flow
  const registration = useRegistration();
  const registerOnChain = useRegisterOnChain(contractAddress);

  // Submission flow
  const submission = useSubmission();
  const submitOnChain = useSubmitOnChain(contractAddress);

  // Claim flow
  const claim = useClaimReward(contractAddress);

  const [isRegistered, setIsRegistered] = useState(false);
  const [userScore, setUserScore] = useState<bigint | null>(null);
  const [rewardInfo, setRewardInfo] = useState<{
    amount: string;
    percentage: number;
  } | null>(null);

  // Auto-refresh state on mount
  useEffect(() => {
    if (contractAddress) {
      refreshCampaignState();
    }
  }, [contractAddress]);

  // Check if user's handle is registered
  useEffect(() => {
    async function checkRegistration() {
      if (submission.handleTiktok && contractAddress) {
        const registered = await isHandleRegistered(submission.handleTiktok);
        setIsRegistered(registered);

        if (registered) {
          const score = await submitOnChain.getHandleScore(submission.handleTiktok);
          setUserScore(score);

          if (currentState === CampaignState.Claimable && score && score > BigInt(0)) {
            const reward = await claim.getRewardAmount(submission.handleTiktok);
            const percentage = await claim.getRewardPercentage(submission.handleTiktok);
            if (reward && percentage !== null) {
              setRewardInfo({
                amount: reward.formattedAmount,
                percentage,
              });
            }
          }
        }
      }
    }
    checkRegistration();
  }, [submission.handleTiktok, currentState, contractAddress]);

  // Registration flow
  async function handleFullRegistration() {
    const proof = await registration.createRegistrationProof();
    if (!proof) return;

    const txHash = await registerOnChain.submitRegistration(proof);
    if (txHash) {
      await refreshCampaignState();
      setIsRegistered(true);
    }
  }

  // Submission flow
  async function handleFullSubmission() {
    const proof = await submission.createSubmissionProof();
    if (!proof) return;

    const txHash = await submitOnChain.submitCampaignProof(proof);
    if (txHash) {
      await refreshCampaignState();
      const score = await submitOnChain.getHandleScore(submission.handleTiktok);
      setUserScore(score);
    }
  }

  // Claim flow
  async function handleClaim() {
    const txHash = await claim.claimReward(submission.handleTiktok);
    if (txHash) {
      await refreshCampaignState();
    }
  }

  // Advance state
  async function handleAdvanceState() {
    const txHash = await advanceState();
    if (txHash) {
      await refreshCampaignState();
    }
  }

  const isWrongChain = chain?.id !== sepolia.id;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light mb-4">TikTok Campaign Verifier V2</h1>
          <p className="text-gray-400 text-lg">Multi-phase campaign with ZK proofs</p>

          {/* Wallet Connection Button */}
          <div className="mt-6 flex justify-center">
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-lg"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="px-6 py-3 bg-zinc-800 rounded-lg">
                  <span className="text-sm text-gray-400">Connected: </span>
                  <span className="font-mono text-sm">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            <a
              href={`https://sepolia.etherscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Contract: {contractAddress}
            </a>
          </div>
        </div>

        {/* Wallet Connection Warning */}
        {!isConnected && (
          <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-400 text-center">
              Please connect your wallet to interact with the campaign
            </p>
          </div>
        )}

        {isWrongChain && isConnected && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400 text-center">
              Please switch to Sepolia network
            </p>
          </div>
        )}

        {/* Campaign State Panel */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-medium">Campaign Status</h2>
            <button
              onClick={refreshCampaignState}
              disabled={isLoadingState}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm disabled:opacity-50"
            >
              {isLoadingState ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">State</div>
              <div className="text-xl font-medium">{getStateName(currentState)}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Registered</div>
              <div className="text-xl font-medium">{stats?.registered.toString() || '0'}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Submitted</div>
              <div className="text-xl font-medium">{stats?.submitted.toString() || '0'}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Score</div>
              <div className="text-xl font-medium">{stats?.totalScore.toString() || '0'}</div>
            </div>
          </div>

          {/* Advance State Button (admin) */}
          <button
            onClick={handleAdvanceState}
            disabled={currentState === CampaignState.Claimable || !isConnected}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
          >
            {currentState === CampaignState.Claimable
              ? 'Campaign Complete'
              : `Advance to ${currentState === CampaignState.Registration ? 'WaitingForProofs' : 'Claimable'}`}
          </button>
        </div>

        {/* TikTok Handle Input */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            TikTok Handle
          </label>
          <input
            type="text"
            value={submission.handleTiktok}
            onChange={(e) => submission.setHandleTiktok(e.target.value)}
            placeholder="@happy_hasbulla_"
            disabled={registration.isLoading || submission.isLoading}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <p className="mt-2 text-sm text-gray-500">
            Campaign ID: cmp_001 (fixed)
          </p>
          {isRegistered && (
            <p className="mt-2 text-sm text-green-400">
              ✓ This handle is registered
              {userScore && userScore > BigInt(0) && ` with score: ${userScore.toString()}`}
            </p>
          )}
        </div>

        {/* Phase 1: Registration */}
        {canRegister(currentState) && (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-8">
            <h3 className="text-xl font-medium mb-4">Phase 1: Registration</h3>
            <p className="text-gray-400 mb-6">
              Register your TikTok handle to participate in the campaign
            </p>

            {isRegistered ? (
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400">✓ Already registered!</p>
              </div>
            ) : (
              <button
                onClick={handleFullRegistration}
                disabled={registration.isLoading || registerOnChain.isRegistering || !isConnected || isWrongChain}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                {registration.isLoading
                  ? 'Generating Registration Proof...'
                  : registerOnChain.isRegistering
                  ? 'Submitting to Blockchain...'
                  : 'Register for Campaign'}
              </button>
            )}

            {(registration.error || registerOnChain.error) && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{registration.error || registerOnChain.error}</p>
              </div>
            )}

            {registerOnChain.registerTxHash && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400 text-sm mb-2">✓ Registration successful!</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${registerOnChain.registerTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm break-all"
                >
                  View transaction →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Phase 2: Submission */}
        {canSubmitProof(currentState) && (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-8">
            <h3 className="text-xl font-medium mb-4">Phase 2: Submit Proof</h3>
            <p className="text-gray-400 mb-6">
              Submit your campaign participation proof to earn points
            </p>

            {!isRegistered ? (
              <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <p className="text-yellow-400">⚠ You must register first</p>
              </div>
            ) : userScore && userScore > BigInt(0) ? (
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400">✓ Already submitted! Score: {userScore.toString()}</p>
              </div>
            ) : (
              <button
                onClick={handleFullSubmission}
                disabled={submission.isLoading || submitOnChain.isSubmitting || !isConnected || isWrongChain}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                {submission.isLoading
                  ? 'Generating Submission Proof...'
                  : submitOnChain.isSubmitting
                  ? 'Submitting to Blockchain...'
                  : 'Submit Campaign Proof'}
              </button>
            )}

            {(submission.error || submitOnChain.error) && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{submission.error || submitOnChain.error}</p>
              </div>
            )}

            {submitOnChain.submitTxHash && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400 text-sm mb-2">✓ Submission successful!</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${submitOnChain.submitTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm break-all"
                >
                  View transaction →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Phase 3: Claim Rewards */}
        {canClaimReward(currentState) && (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-8">
            <h3 className="text-xl font-medium mb-4">Phase 3: Claim Rewards</h3>
            <p className="text-gray-400 mb-6">
              Claim your WETH rewards based on your score
            </p>

            {rewardInfo && (
              <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Your Reward</div>
                    <div className="text-2xl font-medium text-green-400">{rewardInfo.amount} WETH</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Share of Pool</div>
                    <div className="text-2xl font-medium">{rewardInfo.percentage.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            )}

            {!isRegistered || !userScore || userScore === BigInt(0) ? (
              <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <p className="text-yellow-400">⚠ You must submit a proof first</p>
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claim.isClaiming || !isConnected || isWrongChain}
                className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                {claim.isClaiming ? 'Claiming...' : 'Claim WETH Rewards'}
              </button>
            )}

            {claim.error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{claim.error}</p>
              </div>
            )}

            {claim.claimTxHash && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400 text-sm mb-2">✓ Claim successful!</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${claim.claimTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm break-all"
                >
                  View transaction →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {stateError && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400">{stateError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="flex justify-center items-center space-x-2 text-gray-500">
            <span className="text-sm">Powered by</span>
            <a href="https://docs.vlayer.xyz" target="_blank" rel="noopener noreferrer">
              <img src="/powered-by-vlayer.svg" alt="vlayer" className="h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
