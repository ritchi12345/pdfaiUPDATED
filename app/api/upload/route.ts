import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/app/lib/supabaseClient';
import { parsePDF } from '@/app/services/pdfParser';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: NextRequest) {
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
    
    // Check if the user already has 5 PDF documents
    const { data: existingPdfs, error: countError } = await supabase
      .from('pdf_documents')
      .select('id')
      .eq('user_id', user.id);
      
    if (countError) {
      console.error('Error checking PDF count:', countError);
      return NextResponse.json(
        { error: 'Failed to check document limit' },
        { status: 500 }
      );
    }
    
    if (existingPdfs && existingPdfs.length >= 5) {
      return NextResponse.json(
        { error: 'Maximum of 5 PDFs allowed. Please delete one to upload a new one.' },
        { status: 400 }
      );
    }
    
    const formData = await request.formData();
    const pdfFile = formData.get('file') as File;
    
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'Missing required file' },
        { status: 400 }
      );
    }
    
    // Generate a unique filename with UUID
    const fileName = `${uuidv4()}-${pdfFile.name}`;
    
    // Get supabase client with admin privileges
    const supabaseAdmin = createServerSupabaseClient();
    
    // Upload file to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(fileName, pdfFile, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading to Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage' },
        { status: 500 }
      );
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('pdfs')
      .getPublicUrl(fileName);
    
    // Parse the PDF to get metadata (for later use in initializing chat)
    const parsedPdf = await parsePDF(pdfFile);
    
    // Insert record into pdf_documents table
    const { error: insertError } = await supabaseAdmin
      .from('pdf_documents')
      .insert({
        user_id: user.id,
        file_id: fileName,
        file_name: pdfFile.name,
        storage_path: data.path,
        title: parsedPdf.metadata.title || 'Untitled Document',
        page_count: parsedPdf.metadata.pageCount
      });
      
    if (insertError) {
      console.error('Error inserting PDF record:', insertError);
      // Try to clean up the uploaded file if database insertion fails
      await supabaseAdmin.storage.from('pdfs').remove([fileName]);
      return NextResponse.json(
        { error: 'Failed to save PDF metadata' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      fileId: fileName,
      publicUrl,
      metadata: {
        pageCount: parsedPdf.metadata.pageCount,
        title: parsedPdf.metadata.title || 'Untitled Document'
      }
    });
  } catch (error: any) {
    console.error('Error in PDF upload API:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF upload' },
      { status: 500 }
    );
  }
}