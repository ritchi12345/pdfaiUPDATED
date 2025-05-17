'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatInterface from '@/app/components/ChatInterface';
import PDFViewer from '@/app/components/PDFViewer';
import { supabase } from '@/app/lib/supabaseClient';
import { usePDFChat } from '@/app/hooks/usePDFChat';
import { SourceDocument, ChatResponse } from '@/app/models/types';
import { ExplanationLevel, EXPLANATION_LEVELS } from '@/app/components/ChatInterface';
import { useAuth } from '@/app/components/AuthProvider';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.fileId ? decodeURIComponent(params.fileId as string) : null;
  const { session, isLoading: authLoading } = useAuth();
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<{ text: string, pageNumber: number } | null>(null);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("High Schooler");
  const pdfViewerRef = useRef<any>(null);
  const chatInterfaceRef = useRef<{ sendMessage: (message: string) => Promise<void> }>(null);
  
  // Client-side auth check
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [session, authLoading, router]);
  
  // Get the chat service from the hook
  const { 
    chatService, 
    isInitializing, 
    error: chatError, 
    initializeChatForPdf 
  } = usePDFChat();

  // Fetch PDF URL and initialize chat when the component mounts
  useEffect(() => {
    // Don't fetch if not authenticated
    if (!session) return;
    
    async function initializeChat() {
      console.log("Chat page received fileId:", fileId);

      if (!fileId) {
        console.log("No fileId, redirecting to upload");
        router.push('/upload');
        return;
      }

      setLoadingPdf(true);
      setLoadError(null);

      try {
        // Get the public URL for the file from Supabase
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileId);

        if (!publicUrl) {
          throw new Error('Could not get public URL for PDF');
        }

        setPdfUrl(publicUrl);
        
        // Extract filename from the fileId
        const filename = fileId.split('/').pop() || 'Document';
        setFileName(filename);

        // Initialize the chat with the PDF file ID
        await initializeChatForPdf(fileId);
      } catch (err: any) {
        console.error('Error initializing chat:', err);
        setLoadError(err.message || 'Failed to load PDF or initialize chat');
      } finally {
        setLoadingPdf(false);
      }
    }

    initializeChat();
  }, [fileId, router, initializeChatForPdf, session]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  // Handle sending a message
  const handleSendMessage = async (message: string, level: ExplanationLevel): Promise<ChatResponse> => {
    if (!chatService) {
      return { answer: 'Chat not initialized. Please wait or try reloading the page.' };
    }
    
    try {
      const response = await chatService.askQuestion(message, level);
      return response;
    } catch (error: any) {
      console.error('Error processing message:', error);
      throw new Error(error.message || 'Failed to process your message');
    }
  };
  
  // Utility function to highlight text from a source document in the PDF
  // Kept for potential future use but not currently called from anywhere
  const highlightSourceDocument = (sourceDoc: SourceDocument, index: number) => {
    console.log(`Highlighting source document ${index}:`, sourceDoc);
    
    if (sourceDoc.metadata?.pageNumber && sourceDoc.pageContent) {
      // First clear any previous highlight by setting to null
      setActiveHighlight(null);
      
      // Then set the new highlight after a brief delay to ensure the state change is processed
      setTimeout(() => {
        setActiveHighlight({
          text: sourceDoc.pageContent,
          pageNumber: sourceDoc.metadata.pageNumber as number
        });
      }, 50);
    }
  };
  
  // Handle text selection in the PDF
  const handleTextSelection = async (selectedText: string, pageNumber: number) => {
    // Format the message to explain the selected text
    const explainMessage = `Explain this text from the document: "${selectedText}"`;
    
    // Use the chat interface ref to send the message directly to the chat
    if (chatInterfaceRef.current) {
      try {
        await chatInterfaceRef.current.sendMessage(explainMessage);
      } catch (error) {
        console.error('Error explaining selected text:', error);
      }
    }
  };

  if (!fileId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">No PDF selected</p>
          <button 
            onClick={() => router.push('/upload')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Upload a PDF
          </button>
        </div>
      </div>
    );
  }

  if (loadingPdf && !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mr-3"></div>
        <p className="text-lg">Loading PDF...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 p-4 rounded-md max-w-md text-center">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p>{loadError}</p>
          <div className="mt-4 flex justify-center space-x-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/upload')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Upload New PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="w-full p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
        <div className="flex items-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-blue-600 dark:text-blue-400 mr-2"
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
          </svg>
          <h1 className="text-xl font-bold truncate max-w-xs">
            {fileName || 'PDF AI Chat'}
          </h1>
        </div>
        
        <button
          onClick={() => router.push('/upload')}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Upload New PDF
        </button>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column - PDF Viewer */}
        <div className="w-full md:w-1/2 h-[60vh] md:h-[calc(100vh-64px)] border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 overflow-auto">
          {pdfUrl ? (
            <PDFViewer 
              fileUrl={pdfUrl} 
              filePath={fileId} 
              highlightText={activeHighlight}
              onTextSelect={handleTextSelection}
              ref={pdfViewerRef}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">PDF could not be loaded.</p>
            </div>
          )}
        </div>
        
        {/* Right Column - Chat Interface - Fixed Position on Desktop */}
        <div className="w-full md:w-1/2 h-[calc(100vh-60vh-64px)] md:h-[calc(100vh-64px)] md:fixed md:right-0 md:top-[64px] md:w-1/2 flex flex-col">
          {isInitializing ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-2"></div>
              <p>Initializing chat...</p>
            </div>
          ) : chatError ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 p-4 rounded-md">
                <p>{chatError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <ChatInterface
              ref={chatInterfaceRef}
              onSendMessage={handleSendMessage}
              isReady={!!chatService && !isInitializing}
              selectedLevel={explanationLevel}
              onLevelChange={setExplanationLevel}
            />
          )}
        </div>
      </div>
    </div>
  );
}