import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createServerSupabaseClient } from '@/app/lib/supabaseClient';

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

export async function DELETE(request: NextRequest) {
  try {
    // Get document ID from the request URL
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // First, verify the document belongs to the user
    const { data: document, error: documentError } = await supabase
      .from('pdf_documents')
      .select('id, file_id, storage_path')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();
    
    if (documentError || !document) {
      console.error('Error fetching document or document not found:', documentError);
      return NextResponse.json(
        { error: 'Document not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    // Get admin client for storage operations
    const supabaseAdmin = createServerSupabaseClient();
    
    // Delete any chat history related to this document (if such a table exists)
    const { error: chatError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('document_id', documentId);
    
    if (chatError) {
      console.error('Error deleting chat history:', chatError);
      // Continue with the deletion even if chat history deletion fails
    }
    
    // Delete the document record from the database
    const { error: deleteError } = await supabaseAdmin
      .from('pdf_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('Error deleting document record:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }
    
    // Delete the file from storage
    // Use storage_path if available, otherwise use file_id
    const storagePath = document.storage_path || document.file_id;
    const { error: storageError } = await supabaseAdmin.storage
      .from('pdfs')
      .remove([storagePath]);
    
    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // We've already deleted the database record, so just log this error
    }
    
    return NextResponse.json({
      success: true,
      message: 'Document and associated data deleted successfully'
    });
  } catch (error: any) {
    console.error('Error in delete PDF API:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
} 