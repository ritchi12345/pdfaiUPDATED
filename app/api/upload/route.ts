import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/app/lib/supabaseClient';
import { parsePDF } from '@/app/services/pdfParser';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with auth
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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