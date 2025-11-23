import { NextRequest, NextResponse } from 'next/server';

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

    // Return registration data
    const response = {
      campaign_id: "cmp_001",
      handle_tiktok: handle_tiktok,
      proof_self: true
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process registration' },
      { status: 500 }
    );
  }
}
