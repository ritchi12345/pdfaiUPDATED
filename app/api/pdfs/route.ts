import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client with cookie-based auth
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Query the pdf_documents table for the user's documents
    const { data: documents, error: documentsError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (documentsError) {
      console.error('Error fetching PDF documents:', documentsError);
      return NextResponse.json(
        { error: 'Failed to retrieve documents' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      documents
    });
  } catch (error: any) {
    console.error('Error in PDF documents API:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
} 