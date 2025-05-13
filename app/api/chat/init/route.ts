import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseClient';
import { parsePDF } from '@/app/services/pdfParser';
import { initializeChatSession } from '@/app/services/langchainService';
import * as pdfParseLib from 'pdf-parse';

interface InitRequest {
  fileId: string;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as InitRequest;
    const { fileId, sessionId } = body;

    console.log("Received init request with fileId:", fileId);
    console.log("Received sessionId:", sessionId);

    if (!fileId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId and sessionId' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseAdmin = createServerSupabaseClient();
    let fileData: Blob | null = null;

    try {
      console.log("Attempting to download file with ID:", fileId);

      // First check if the file exists
      const { data: listData, error: listError } = await supabaseAdmin.storage
        .from('pdfs')
        .list();

      if (listError) {
        console.error("Error listing bucket contents:", listError);
        return NextResponse.json(
          { error: 'Error listing bucket contents' },
          { status: 500 }
        );
      }

      console.log("Files in the bucket:", listData?.map(file => file.name));

      // Download the file directly from Supabase
      const { data: downloadedFile, error: downloadError } = await supabaseAdmin.storage
        .from('pdfs')
        .download(fileId);

      if (downloadError || !downloadedFile) {
        console.error('Error downloading PDF from Supabase:', downloadError);

        // Try with a signed URL approach as a fallback
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('pdfs')
          .createSignedUrl(fileId, 60);

        if (signedUrlError || !signedUrlData) {
          console.error('Error creating signed URL:', signedUrlError);
          return NextResponse.json(
            { error: 'Could not download PDF from storage or create signed URL' },
            { status: 404 }
          );
        }

        console.log("Created signed URL:", signedUrlData.signedUrl);

        // Try to fetch from the signed URL
        const fetchResponse = await fetch(signedUrlData.signedUrl);
        if (!fetchResponse.ok) {
          console.error(`Failed to fetch from signed URL: ${fetchResponse.status} ${fetchResponse.statusText}`);
          return NextResponse.json(
            { error: 'Could not fetch PDF using signed URL' },
            { status: 404 }
          );
        }

        // Try to get the file data from the fetch response
        fileData = await fetchResponse.blob();
        if (!fileData) {
          return NextResponse.json(
            { error: 'Could not download PDF from storage directly' },
            { status: 404 }
          );
        }
      } else {
        // Store the downloaded file data
        fileData = downloadedFile;
      }
    } catch (downloadException) {
      console.error("Exception during download:", downloadException);
      return NextResponse.json(
        { error: `Exception during download: ${downloadException.message}` },
        { status: 500 }
      );
    }

    // Handle successful download from first attempt
    if (!fileData) {
      return NextResponse.json(
        { error: 'Failed to get PDF data even though download appeared successful' },
        { status: 500 }
      );
    }

    // Use pdf-parse directly since we're on the server
    const pdfParse = pdfParseLib.default || pdfParseLib;

    // Parse the PDF data directly - need to handle different types of Blob/File
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfData = await pdfParse(new Uint8Array(arrayBuffer));

    // Extract metadata
    const metadata = {
      info: pdfData.info || {},
      pageCount: pdfData.numpages || 0,
      title: pdfData.info?.Title || undefined,
      author: pdfData.info?.Author || undefined,
      creationDate: pdfData.info?.CreationDate
        ? new Date(pdfData.info.CreationDate)
        : undefined,
    };

    // Split text into chunks (approximately 1000 characters each)
    const chunkSize = 1000;
    const text = pdfData.text || '';
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    // Extract text from each page to create pageTexts
    const pageTexts: Array<{ pageNumber: number; text: string }> = [];
    
    try {
      // Extract text page by page
      for (let pageNum = 1; pageNum <= metadata.pageCount; pageNum++) {
        const options = {
          max: pageNum,
          min: pageNum,
        };
        
        // Get text for just this page
        const pageData = await pdfParse(new Uint8Array(arrayBuffer), options);
        
        pageTexts.push({
          pageNumber: pageNum,
          text: pageData.text || '',
        });
      }
    } catch (pageError) {
      console.error("Error extracting page-specific text:", pageError);
      // Continue with the basic text extraction approach
    }
    
    // Create our parsedPdf object
    const parsedPdf = {
      text,
      metadata,
      chunks,
      pageTexts: pageTexts.length > 0 ? pageTexts : undefined,
    };

    // Initialize chat session with the parsed PDF
    await initializeChatSession(parsedPdf, sessionId);

    return NextResponse.json({
      success: true,
      message: 'Chat session initialized successfully'
    });
  } catch (error: any) {
    console.error('Error initializing chat session:', error);
    return NextResponse.json(
      { error: 'Failed to initialize chat session: ' + error.message },
      { status: 500 }
    );
  }
}