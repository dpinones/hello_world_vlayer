import { NextRequest, NextResponse } from 'next/server';

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

    // Generate random score between 20 and 100
    const score_calidad = Math.floor(Math.random() * (100 - 20 + 1)) + 20;

    // Return verification data
    const response = {
      campaign_id: "cmp_001",
      handle_tiktok: handle_tiktok,
      score_calidad: score_calidad,
      url_video: url_video
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Verify video API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify video' },
      { status: 500 }
    );
  }
}
