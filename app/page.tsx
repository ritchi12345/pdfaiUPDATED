'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the upload page when the user visits the root page
    router.replace('/upload');
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <p>Redirecting to upload page...</p>
    </div>
  );
}