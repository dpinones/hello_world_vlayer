"use client";

import { useState } from "react";
import { proveContributions, verifyPresentation, compressPresentation } from "../lib/api";
import { extractContributionData, parseOwnerRepo, decodeJournalData } from "../lib/utils";
import type { PageResult, ZKProofNormalized } from "../lib/types";

export function useProveFlow() {
  const [handleTiktok, setHandleTiktok] = useState('@happy_hasbulla_');

  const [isProving, setIsProving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [presentation, setPresentation] = useState<any>(null);
  const [result, setResult] = useState<PageResult | null>(null);
  const [zkProofResult, setZkProofResult] = useState<ZKProofNormalized | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProve() {
    setIsProving(true);
    setError(null);
    setResult(null);
    setZkProofResult(null);

    try {
      // For TikTok, we don't need any parameters - just call the API
      const data = await proveContributions();
      setPresentation(data);
      setResult({ type: 'prove', data });
    } catch (err: any) {
      setError(err?.message || 'Failed to prove TikTok data');
    } finally {
      setIsProving(false);
    }
  }

  async function handleVerify() {
    if (!presentation) {
      setError('Please generate proof first');
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const data = await verifyPresentation(presentation);
      setResult({ type: 'verify', data });
    } catch (err: any) {
      setError(err?.message || 'Failed to verify presentation');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleCompress() {
    if (!presentation) {
      setError('Please generate proof first');
      return;
    }
    if (!handleTiktok.trim()) {
      setError('Please enter TikTok handle');
      return;
    }
    setIsCompressing(true);
    setError(null);
    try {
      const data = await compressPresentation(presentation, handleTiktok.trim());

      // Extract zkProof and journalDataAbi
      const zkProof = data.success ? data.data.zkProof : data.zkProof;
      const journalDataAbi = data.success ? data.data.journalDataAbi : data.journalDataAbi;

      if (!zkProof || !journalDataAbi) {
        throw new Error('Compression response missing zkProof or journalDataAbi');
      }

      // Decode journal data for TikTok
      const decoded = decodeJournalData(journalDataAbi as `0x${string}`);
      const campaignData = {
        campaignId: decoded.campaignId,
        handleTiktok: decoded.handleTiktok,
        scoreCalidad: Number(decoded.scoreCalidad),
        urlVideo: decoded.urlVideo
      };

      setZkProofResult({
        zkProof: zkProof as `0x${string}`,
        journalDataAbi: journalDataAbi as `0x${string}`,
        campaignData
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to generate ZK proof');
    } finally {
      setIsCompressing(false);
    }
  }

  return {
    // state
    handleTiktok, setHandleTiktok,
    isProving, isVerifying, isCompressing,
    presentation,
    result,
    zkProofResult,
    error, setError,
    // actions
    handleProve,
    handleVerify,
    handleCompress,
  } as const;
}


