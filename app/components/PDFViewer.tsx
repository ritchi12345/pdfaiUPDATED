'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure pdfjs worker with fallback options
if (typeof window !== 'undefined') {
  // Try to use our local worker first
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
}

interface PDFViewerProps {
  fileUrl: string;
  filePath?: string; // Optional direct Supabase path
}

export default function PDFViewer({ fileUrl, filePath }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.7);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get a signed URL if we have a filePath
  useEffect(() => {
    async function getSignedUrl() {
      if (filePath) {
        try {
          const response = await fetch('/api/storage/get-signed-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: filePath })
          });

          if (!response.ok) {
            throw new Error('Failed to get signed URL');
          }

          const data = await response.json();
          setSignedUrl(data.signedUrl);
        } catch (err) {
          console.error('Error getting signed URL:', err);
          setError('Failed to get secure access to PDF');
        }
      }
    }

    if (filePath) {
      getSignedUrl();
    }
  }, [filePath]);

  // Calculate responsive width
  const getPageWidth = () => {
    // For mobile screens
    if (windowWidth < 768) {
      return windowWidth - 40; // Full width minus some padding
    }
    // For desktop screens (two-column layout)
    return Math.min((windowWidth / 2) - 40, 800);
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    console.error('Current URL being used:', signedUrl || fileUrl);
    console.error('File path:', filePath);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return newPageNumber >= 1 && newPageNumber <= (numPages || 1) 
        ? newPageNumber 
        : prevPageNumber;
    });
  }

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.2, 2.5));
  }

  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* PDF Container */}
      <div className="flex-1 overflow-auto flex justify-center p-2 pdf-container">
        {loading && (
          <div className="flex items-center justify-center h-full w-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full w-full">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 p-4 rounded-md">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        <style jsx global>{`
          .pdf-container {
            overflow: auto !important;
          }
          .pdf-page {
            margin-bottom: 8px;
          }
          .pdf-document {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .react-pdf__Page__textContent {
            width: auto !important;
            height: auto !important;
            top: 0 !important;
            left: 0 !important;
          }
        `}</style>
        
        <Document
          file={signedUrl || fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="flex justify-center items-center h-full">Loading PDF...</div>}
          className="pdf-document"
        >
          <Page
            pageNumber={pageNumber}
            width={getPageWidth()}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="pdf-page"
          />
        </Document>
      </div>
      
      {/* Controls */}
      {numPages && !error && (
        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              aria-label="Previous page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              aria-label="Next page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              aria-label="Zoom out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 2.5}
              className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              aria-label="Zoom in"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}