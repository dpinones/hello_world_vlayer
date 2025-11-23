"use client";

import { useState } from "react";
import { decodeSubmissionJournalData } from "../lib/utils";
import type { SubmissionProof, SubmissionData } from "../lib/types";

export function useSubmission() {
  const [handleTiktok, setHandleTiktok] = useState('@happy_hasbulla_');
  const [urlVideo, setUrlVideo] = useState('https://www.tiktok.com/@happy_hasbulla_/video/7445559942862261506');
  const [isProving, setIsProving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [presentation, setPresentation] = useState<any>(null);
  const [submissionProof, setSubmissionProof] = useState<SubmissionProof | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Generate proof from TikTok videos API
  async function generateSubmissionProof() {
    if (!handleTiktok.trim()) {
      setError('Please enter TikTok handle');
      return null;
    }

    if (!urlVideo.trim()) {
      setError('Please enter video URL');
      return null;
    }

    setIsProving(true);
    setError(null);
    setPresentation(null);
    setSubmissionProof(null);

    try {
      const response = await fetch('/api/prove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handle_tiktok: handleTiktok.trim(),
          url_video: urlVideo.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate submission proof');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPresentation(data);
      return data;
    } catch (err: any) {
      console.error('Error generating submission proof:', err);
      setError(err?.message || 'Failed to generate submission proof');
      return null;
    } finally {
      setIsProving(false);
    }
  }

  // Step 2: Compress proof to get ZK proof
  async function compressSubmissionProof() {
    if (!presentation) {
      setError('Please generate proof first');
      return null;
    }

    if (!handleTiktok.trim()) {
      setError('Please enter TikTok handle');
      return null;
    }

    setIsCompressing(true);
    setError(null);

    try {
      const response = await fetch('/api/compress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentation,
          handleTiktok: handleTiktok.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compress submission proof');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract zkProof and journalDataAbi
      const zkProof = data.success ? data.data?.zkProof : data.zkProof;
      const journalDataAbi = data.success ? data.data?.journalDataAbi : data.journalDataAbi;

      if (!zkProof || !journalDataAbi) {
        throw new Error('Compression response missing zkProof or journalDataAbi');
      }

      // Decode journal data to extract submission data
      const decoded = decodeSubmissionJournalData(journalDataAbi as `0x${string}`);
      const submissionData: SubmissionData = {
        campaignId: decoded.campaignId,
        handleTiktok: decoded.handleTiktok,
        scoreCalidad: Number(decoded.scoreCalidad),
        urlVideo: decoded.urlVideo,
      };

      const proof: SubmissionProof = {
        zkProof: zkProof as `0x${string}`,
        journalDataAbi: journalDataAbi as `0x${string}`,
        submissionData,
      };

      setSubmissionProof(proof);
      return proof;
    } catch (err: any) {
      console.error('Error compressing submission proof:', err);
      setError(err?.message || 'Failed to compress submission proof');
      return null;
    } finally {
      setIsCompressing(false);
    }
  }

  // Combined flow: generate + compress
  async function createSubmissionProof(): Promise<SubmissionProof | null> {
    // Reset state first
    setPresentation(null);
    setSubmissionProof(null);
    setError(null);

    if (!handleTiktok.trim()) {
      setError('Please enter TikTok handle');
      return null;
    }

    // Generate proof
    const proofData = await generateSubmissionProof();
    if (!proofData) return null;

    // Compress using the proofData directly instead of relying on state
    setIsCompressing(true);
    try {
      const response = await fetch('/api/compress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentation: proofData,
          handleTiktok: handleTiktok.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compress submission proof');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract zkProof and journalDataAbi
      const zkProof = data.success ? data.data?.zkProof : data.zkProof;
      const journalDataAbi = data.success ? data.data?.journalDataAbi : data.journalDataAbi;

      if (!zkProof || !journalDataAbi) {
        throw new Error('Compression response missing zkProof or journalDataAbi');
      }

      // Decode journal data to extract submission data
      const decoded = decodeSubmissionJournalData(journalDataAbi as `0x${string}`);
      const submissionData: SubmissionData = {
        campaignId: decoded.campaignId,
        handleTiktok: decoded.handleTiktok,
        scoreCalidad: Number(decoded.scoreCalidad),
        urlVideo: decoded.urlVideo,
      };

      const proof: SubmissionProof = {
        zkProof: zkProof as `0x${string}`,
        journalDataAbi: journalDataAbi as `0x${string}`,
        submissionData,
      };

      setSubmissionProof(proof);
      return proof;
    } catch (err: any) {
      console.error('Error compressing submission proof:', err);
      setError(err?.message || 'Failed to compress submission proof');
      return null;
    } finally {
      setIsCompressing(false);
    }
  }

  // Reset state
  function reset() {
    setPresentation(null);
    setSubmissionProof(null);
    setError(null);
  }

  return {
    // State
    handleTiktok,
    setHandleTiktok,
    urlVideo,
    setUrlVideo,
    isProving,
    isCompressing,
    isLoading: isProving || isCompressing,
    presentation,
    submissionProof,
    error,
    setError,

    // Actions
    generateSubmissionProof,
    compressSubmissionProof,
    createSubmissionProof,
    reset,
  } as const;
}
