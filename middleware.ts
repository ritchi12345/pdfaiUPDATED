import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // Define protected and auth routes
  const protectedRoutes = ['/upload', '/chat'];
  const authRoutes = ['/login'];
  
  const path = req.nextUrl.pathname;
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    path.startsWith(route)
  );
  
  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route => 
    path.startsWith(route)
  );
  
  // Redirect logic
  if (isProtectedRoute && !session) {
    // Redirect unauthenticated users trying to access protected routes to login
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (isAuthRoute && session) {
    // Redirect authenticated users trying to access auth routes to upload
    const redirectUrl = new URL('/upload', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  return res;
}

// Configure the matcher to specify which paths the middleware should run on
export const config = {
  matcher: [
    '/upload',
    '/chat/:path*',
    '/login',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 