'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PDFUpload from '../components/PDFUpload';
import PDFListItem from '../components/PDFListItem';
import { v4 as uuidv4 } from 'uuid';

interface PDFDocument {
  id: string;
  file_name: string;
  file_id: string;
  created_at: string;
}

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfHistory, setPdfHistory] = useState<PDFDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch user's PDF documents on component mount
  useEffect(() => {
    const fetchUserPDFs = async () => {
      setIsLoading(true);
      setFetchError(null);
      
      try {
        const response = await fetch('/api/pdfs');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch PDF documents');
        }
        
        const data = await response.json();
        setPdfHistory(data.documents || []);
      } catch (err: any) {
        console.error('Error fetching PDF documents:', err);
        setFetchError(err.message || 'Failed to load your PDF documents. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserPDFs();
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Create a unique identifier for this PDF
    const pdfId = uuidv4();
    formData.append('pdfId', pdfId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload PDF');
      }

      const result = await response.json();
      
      // Navigate to the chat page with the file ID
      router.push(`/chat/${encodeURIComponent(result.fileId)}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePDF = async (id: string) => {
    try {
      const response = await fetch(`/api/pdfs?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete PDF');
      }
      
      // Update local state to remove the deleted PDF
      setPdfHistory(pdfHistory.filter(doc => doc.id !== id));
    } catch (err: any) {
      console.error('Error deleting PDF:', err);
      throw err;
    }
  };

  const hasReachedLimit = pdfHistory.length >= 5;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 font-[family-name:var(--font-geist-sans)]">
      <header className="w-full p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-blue-600 dark:text-blue-400"
            >
              <path
                d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 2V8H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 13H8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 17H8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 9H9H8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-xl font-bold">Your PDF Dashboard</h1>
          </div>
          
          <a
            href="https://github.com/yourusername/pdf_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.477 2 2 6.477 2 12C2 16.991 5.57 21.128 10.43 22V18.586C10.0535 18.6764 9.67871 18.7157 9.32 18.702C8.33 18.666 7.677 18.13 7.323 17.444C7.077 16.992 6.472 16.3 6.121 16.109C5.835 15.958 5.626 15.721 5.828 15.709C6.429 15.677 6.84 16.322 6.969 16.517C7.541 17.405 8.362 17.492 9.359 17.141C9.459 16.671 9.67 16.293 9.92 16.073C7.446 15.807 6.44 14.385 6.44 12.72C6.44 11.782 6.803 10.842 7.442 10.115C7.33 9.831 7.1 9.041 7.525 7.782C7.525 7.782 8.23 7.525 9.969 8.701C10.6337 8.50048 11.3153 8.39965 12 8.4C12.69 8.4 13.38 8.5 14.031 8.701C15.77 7.516 16.476 7.782 16.476 7.782C16.9 9.041 16.67 9.831 16.559 10.115C17.197 10.842 17.561 11.773 17.561 12.72C17.561 14.394 16.546 15.807 14.071 16.073C14.393 16.347 14.68 16.878 14.68 17.693V22C19.429 21.129 23 16.992 23 12C23 6.477 18.523 2 12 2Z"
                fill="currentColor"
              />
            </svg>
          </a>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        {!hasReachedLimit ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-center">Upload a New PDF</h2>
            
            <PDFUpload onFileUpload={handleFileUpload} />
            
            {isUploading && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-2 text-sm text-gray-600 dark:text-gray-400">Uploading PDF...</p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800 mb-6">
            <h2 className="text-lg font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              PDF Limit Reached
            </h2>
            <p className="mt-2 text-amber-700 dark:text-amber-300 text-sm">
              You have reached the maximum limit of 5 PDFs. Please delete some PDFs below before uploading a new one.
            </p>
          </div>
        )}
        
        <div className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold mb-4">Your PDF Documents</h2>
          
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading your PDFs...</p>
            </div>
          ) : fetchError ? (
            <div className="p-6 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md">
              <p>{fetchError}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : pdfHistory.length === 0 ? (
            <div className="p-6 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md text-center">
              <p>You have not uploaded any PDFs yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pdfHistory.map((doc) => (
                <PDFListItem 
                  key={doc.id} 
                  document={doc}
                  onDelete={handleDeletePDF}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li>Upload your PDF document</li>
            <li>Our AI will process and analyze the content</li>
            <li>You'll be redirected to the chat page</li>
            <li>Ask questions about your document and get accurate answers based on the content</li>
          </ol>
        </div>
      </main>

      <footer className="w-full p-6 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <p>PDF AI Chat - Powered by Next.js, LangChain, Supabase and OpenAI</p>
          <p className="mt-1">© {new Date().getFullYear()} Your Company</p>
        </div>
      </footer>
    </div>
  );
}