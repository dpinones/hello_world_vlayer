"use client";

import { useState } from "react";
import { decodeRegistrationJournalData } from "../lib/utils";
import type { RegistrationProof, RegistrationData } from "../lib/types";

export function useRegistration() {
  const [handleTiktok, setHandleTiktok] = useState('@happy_hasbulla_');
  const [isProving, setIsProving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [presentation, setPresentation] = useState<any>(null);
  const [registrationProof, setRegistrationProof] = useState<RegistrationProof | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Generate proof from registry.json
  async function generateRegistrationProof() {
    if (!handleTiktok.trim()) {
      setError('Please enter TikTok handle');
      return null;
    }

    setIsProving(true);
    setError(null);
    setPresentation(null);
    setRegistrationProof(null);

    try {
      const response = await fetch('/api/prove-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handle_tiktok: handleTiktok.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate registration proof');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPresentation(data);
      return data;
    } catch (err: any) {
      console.error('Error generating registration proof:', err);
      setError(err?.message || 'Failed to generate registration proof');
      return null;
    } finally {
      setIsProving(false);
    }
  }

  // Step 2: Compress proof to get ZK proof
  async function compressRegistrationProof() {
    if (!presentation) {
      setError('Please generate proof first');
      return null;
    }

    setIsCompressing(true);
    setError(null);

    try {
      const response = await fetch('/api/compress-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ presentation }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compress registration proof');
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

      // Decode journal data to extract registration data
      const decoded = decodeRegistrationJournalData(journalDataAbi as `0x${string}`);
      const registrationData: RegistrationData = {
        campaignId: decoded.campaignId,
        handleTiktok: decoded.handleTiktok,
      };

      const proof: RegistrationProof = {
        zkProof: zkProof as `0x${string}`,
        journalDataAbi: journalDataAbi as `0x${string}`,
        registrationData,
      };

      setRegistrationProof(proof);
      return proof;
    } catch (err: any) {
      console.error('Error compressing registration proof:', err);
      setError(err?.message || 'Failed to compress registration proof');
      return null;
    } finally {
      setIsCompressing(false);
    }
  }

  // Combined flow: generate + compress
  async function createRegistrationProof(): Promise<RegistrationProof | null> {
    // Reset state first
    setPresentation(null);
    setRegistrationProof(null);
    setError(null);

    // Generate proof
    const proofData = await generateRegistrationProof();
    if (!proofData) return null;

    // Compress using the proofData directly instead of relying on state
    setIsCompressing(true);
    try {
      const response = await fetch('/api/compress-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ presentation: proofData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compress registration proof');
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

      // Decode journal data to extract registration data
      const decoded = decodeRegistrationJournalData(journalDataAbi as `0x${string}`);
      const registrationData: RegistrationData = {
        campaignId: decoded.campaignId,
        handleTiktok: decoded.handleTiktok,
      };

      const proof: RegistrationProof = {
        zkProof: zkProof as `0x${string}`,
        journalDataAbi: journalDataAbi as `0x${string}`,
        registrationData,
      };

      setRegistrationProof(proof);
      return proof;
    } catch (err: any) {
      console.error('Error compressing registration proof:', err);
      setError(err?.message || 'Failed to compress registration proof');
      return null;
    } finally {
      setIsCompressing(false);
    }
  }

  // Reset state
  function reset() {
    setPresentation(null);
    setRegistrationProof(null);
    setError(null);
  }

  return {
    // State
    handleTiktok,
    setHandleTiktok,
    isProving,
    isCompressing,
    isLoading: isProving || isCompressing,
    presentation,
    registrationProof,
    error,
    setError,

    // Actions
    generateRegistrationProof,
    compressRegistrationProof,
    createRegistrationProof,
    reset,
  } as const;
}
