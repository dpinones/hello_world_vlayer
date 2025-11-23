import { NextRequest, NextResponse } from 'next/server';

// Configure max duration for Vercel
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { presentation } = body;

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation data is required' },
        { status: 400 }
      );
    }

    // Extract config for REGISTRATION - 3 fields
    const extractConfig = {
      "response.body": {
        "jmespath": [
          `campaign_id`,      // Field 1: Campaign ID
          `handle_tiktok`,    // Field 2: TikTok Handle
          `proof_self`        // Field 3: Proof of self (boolean)
        ]
      }
    };

    const requestBody = {
      presentation,
      extraction: extractConfig
    };

    console.log('Compressing REGISTRATION web proof');
    console.log('Extract config:', JSON.stringify(extractConfig, null, 2));

    const zkProverUrl = process.env.ZK_PROVER_API_URL || 'https://zk-prover.vlayer.xyz/api/v0';
    const response = await fetch(`${zkProverUrl}/compress-web-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.WEB_PROVER_API_CLIENT_ID || '',
        'Authorization': 'Bearer ' + process.env.WEB_PROVER_API_SECRET,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(85000) // 85 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ZK Prover API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Debug logging
    console.log('=== REGISTRATION ZK PROOF COMPRESSION RESPONSE ===');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    console.log('=== END ZK PROOF RESPONSE ===');

    return NextResponse.json(data);
  } catch (error) {
    console.error('Compress-register API error:', error);

    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timed out. ZK proof generation took too long to complete. Please try again.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compress registration proof' },
      { status: 500 }
    );
  }
}
