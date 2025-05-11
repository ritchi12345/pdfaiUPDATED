import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/app/services/langchainService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }
    
    // Get chat history
    const history = await getChatHistory(sessionId);
    
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}