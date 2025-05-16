import { NextRequest, NextResponse } from 'next/server';
import { askQuestionInSession } from '@/app/services/langchainService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface AskRequest {
  message: string;
  sessionId: string;
  fileId?: string; // Optional for context
  level?: string; // Explanation level
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with auth
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as AskRequest;
    const { message, sessionId, level } = body;
    
    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: message and sessionId' },
        { status: 400 }
      );
    }
    
    // Process the message using the session
    try {
      const response = await askQuestionInSession(message, sessionId, level);
      
      // Return the response with source documents
      return NextResponse.json(response);
    } catch (error: any) {
      console.error('Error processing message:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process question. Session may not be initialized.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}