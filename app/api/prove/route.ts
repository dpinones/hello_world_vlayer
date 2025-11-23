import { NextRequest, NextResponse } from 'next/server';

// Configure max duration for Vercel (up to 90 seconds)
export const maxDuration = 160;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle_tiktok, url_video } = body;

    if (!handle_tiktok) {
      return NextResponse.json(
        { error: 'handle_tiktok is required' },
        { status: 400 }
      );
    }

    if (!url_video) {
      return NextResponse.json(
        { error: 'url_video is required' },
        { status: 400 }
      );
    }

    // Use the internal /api/verify-video endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verifyVideoUrl = `${baseUrl}/api/verify-video`;

    const requestBody = {
      url: verifyVideoUrl,
      method: 'POST',
      headers: [
        'User-Agent: zk-tiktok-campaign-verifier',
        'Accept: application/json',
        'Content-Type: application/json',
      ],
      body: JSON.stringify({ handle_tiktok, url_video }),
    } as const;

    console.log('Sending to vlayer API (prove):', JSON.stringify(requestBody, null, 2));
    console.log('Upstream URL being proved:', requestBody.url);
    console.log('Headers being sent:', requestBody.headers);

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
    console.error('Prove API error:', error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timed out. GitHub API took too long to respond. Please try again.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prove URL' },
      { status: 500 }
    );
  }
}
