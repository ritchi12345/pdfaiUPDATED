import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseClient';
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
    
    const body = await request.json();
    const { path, bucket = 'pdfs', expiresIn = 3600 } = body;

    console.log("Received path for signed URL:", path);
    console.log("Bucket:", bucket);

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }
    
    const supabaseAdmin = createServerSupabaseClient();
    
    // Create signed URL for the file
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error || !data) {
      console.error('Error creating signed URL:', error);
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
    }
    
    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error('Error in get-signed-url API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}