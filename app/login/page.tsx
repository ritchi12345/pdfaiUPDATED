'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuth } from '@/app/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const supabase = createClientComponentClient();

  // Redirect to upload page if already authenticated
  useEffect(() => {
    if (session && !isLoading) {
      router.push('/upload');
    }
  }, [session, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen justify-center items-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated, show the auth UI
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Or create a new account to get started
            </p>
          </div>
          
          <div className="mt-8">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#4F46E5',
                      brandAccent: '#4338CA',
                    },
                  },
                },
              }}
              view="sign_in"
              showLinks={true}
              redirectTo="http://localhost:3000/auth/callback"
            />
          </div>
        </div>
      </div>
    );
  }

  // This should not be visible as the useEffect should redirect
  return null;
} 