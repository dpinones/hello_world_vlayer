import { NextRequest, NextResponse } from 'next/server';

// Configure max duration for Vercel
export const maxDuration = 160;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle_tiktok } = body;

    if (!handle_tiktok) {
      return NextResponse.json(
        { error: 'handle_tiktok is required' },
        { status: 400 }
      );
    }

    // Use the internal /api/register endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const registrationUrl = `${baseUrl}/api/register`;

    const requestBody = {
      url: registrationUrl,
      method: 'POST',
      headers: [
        'User-Agent: zk-tiktok-campaign-verifier-register',
        'Accept: application/json',
        'Content-Type: application/json',
      ],
      body: JSON.stringify({ handle_tiktok }),
    } as const;

    console.log('Sending to vlayer API (prove-register):', JSON.stringify(requestBody, null, 2));

    const baseUrl = (process.env.WEB_PROVER_API_URL || 'https://web-prover.vlayer.xyz/api/v1').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/prove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.WEB_PROVER_API_CLIENT_ID || '',
        'Authorization': 'Bearer ' + process.env.WEB_PROVER_API_SECRET,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('vlayer API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Prove-register API error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prove registration URL' },
      { status: 500 }
    );
  }
}
