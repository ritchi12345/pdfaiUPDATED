import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler for Supabase auth callbacks
 * This exchanges an auth code for a session as part of the OAuth flow
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // If there's no code in the URL, redirect to home page
  if (!code) {
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }

  try {
    // Create a Supabase client for this route handler using the cookies
    const supabase = createRouteHandlerClient({ cookies });
    
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
    
    // Redirect to the upload page on successful authentication
    return NextResponse.redirect(new URL('/upload', requestUrl.origin));
  } catch (error) {
    console.error('Error in auth callback:', error);
    // Redirect to error page or home page on failure
    return NextResponse.redirect(
      new URL('/?error=Authentication%20failed', requestUrl.origin)
    );
  }
} 