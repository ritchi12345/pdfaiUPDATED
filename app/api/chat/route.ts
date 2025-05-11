import { NextRequest, NextResponse } from 'next/server';
import { parsePDF } from '@/app/services/pdfParser';
import { initializeChatSession, askQuestionInSession, getChatHistory, clearChatSession } from '@/app/services/langchainService';

// Define expected request body structure
interface ChatRequest {
  message: string;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    
    // Validate request
    if (!body.message || !body.sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: message and sessionId' },
        { status: 400 }
      );
    }
    
    // Process the message
    try {
      const response = await askQuestionInSession(body.message, body.sessionId);
      
      // Return the response
      return NextResponse.json({ 
        answer: response
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Session not found. Please upload a PDF first.' },
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

// API route for PDF upload and session initialization
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    
    // Validate request
    if (!pdfFile || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: file and sessionId' },
        { status: 400 }
      );
    }
    
    // Parse the PDF
    const parsedPdf = await parsePDF(pdfFile);
    
    // Initialize a new chat session
    await initializeChatSession(parsedPdf, sessionId);
    
    // Return success
    return NextResponse.json({ 
      success: true,
      pageCount: parsedPdf.metadata.pageCount,
      title: parsedPdf.metadata.title || 'Untitled Document'
    });
  } catch (error) {
    console.error('Error in PDF upload API:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF file' },
      { status: 500 }
    );
  }
}

// API route for session cleanup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }
    
    // Delete the session
    await clearChatSession(sessionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in session cleanup API:', error);
    return NextResponse.json(
      { error: 'Failed to clean up session' },
      { status: 500 }
    );
  }
}