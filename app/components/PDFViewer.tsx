'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import SelectionPopup from './SelectionPopup';

// Configure pdfjs worker with fallback options
if (typeof window !== 'undefined') {
  // Try to use our local worker first
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
}

interface PDFViewerProps {
  fileUrl: string;
  filePath?: string; // Optional direct Supabase path
  highlightText?: { text: string, pageNumber: number } | null;
  onTextSelect?: (selectedText: string, pageNumber: number) => void;
  ref?: React.Ref<any>;
}


const PDFViewerComponent = forwardRef<HTMLDivElement, PDFViewerProps>(({ 
  fileUrl, 
  filePath,
  highlightText,
  onTextSelect
}, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.7);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [currentHighlight, setCurrentHighlight] = useState<{ text: string, pageNumber: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update current highlight when highlightText prop changes
  useEffect(() => {
    if (highlightText) {
      setCurrentHighlight(highlightText);
      
      // In continuous scrolling mode, need to ensure target page is rendered
      // Store current highlight for later highlighting when pages render
      
      // Scroll to the page containing the highlight first
      const targetPageElement = document.getElementById(`pdf-page-${highlightText.pageNumber}`);
      if (targetPageElement) {
        // If the page is already in the DOM, scroll to it
        targetPageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a small delay to allow the page to be centered before attempting to highlight
        setTimeout(() => {
          highlightTextInDocument(highlightText.text, highlightText.pageNumber);
        }, 500);
      } else {
        // For single page view, navigate to the correct page first
        if (highlightText.pageNumber !== pageNumber) {
          setPageNumber(highlightText.pageNumber);
          // Highlighting will happen when the page loads
        }
      }
    }
  }, [highlightText]);
  
  // Function to highlight text within the PDF
  const highlightTextInDocument = (text: string, textPageNumber: number) => {
    if (!text.trim()) return;
    
    try {
      // Remove any existing highlights first
      document.querySelectorAll('.highlight-text').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          // Replace the highlight span with its text content
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          // Normalize the parent to merge adjacent text nodes
          parent.normalize();
        }
      });
      
      // Target the specific page's text layer
      const pageSelector = `.react-pdf__Page[data-page-number="${textPageNumber}"] .react-pdf__Page__textContent span`;
      const textElements = document.querySelectorAll(pageSelector);
      
      if (textElements.length === 0) {
        console.log(`No text elements found for page ${textPageNumber}. Current page: ${pageNumber}`);
        return;
      }
      
      // Clean the search text for better matching
      let cleanSearchText = text.trim().replace(/\s+/g, ' ').toLowerCase();
      
      // If text is very long, take first and last sentence for better matching
      if (cleanSearchText.length > 150) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 1) {
          const firstSentence = sentences[0];
          const lastSentence = sentences[sentences.length - 1];
          // If we still have too much text, use keywords extraction
          if ((firstSentence + lastSentence).length > 150) {
            // Extract important words - let's use words with 5+ characters as "important"
            const importantWords = text.match(/\b\w{5,}\b/g) || [];
            if (importantWords.length > 3) {
              // Use the first few important words for matching
              cleanSearchText = importantWords.slice(0, 5).join(' ').toLowerCase();
            }
          } else {
            // Use first and last sentences
            cleanSearchText = (firstSentence + " " + lastSentence).toLowerCase().replace(/\s+/g, ' ');
          }
        }
      }
      
      // Collect text content from the page into a single string to find matches
      let pageTextContent = '';
      const elementTexts: {element: Element, startIndex: number, text: string}[] = [];
      
      textElements.forEach(element => {
        const text = element.textContent || '';
        elementTexts.push({
          element,
          startIndex: pageTextContent.length,
          text
        });
        pageTextContent += text + ' ';
      });
      
      pageTextContent = pageTextContent.toLowerCase();
      
      // Try to find and highlight the text
      let foundMatch = false;
      let matchStart = -1;
      
      // First try exact match
      matchStart = pageTextContent.indexOf(cleanSearchText);
      
      // If no exact match, try with partial matching
      if (matchStart === -1) {
        // Try to find the longest matching substring
        let longestMatch = '';
        let longestMatchStart = -1;
        
        // Split search text into words
        const searchWords = cleanSearchText.split(' ').filter(w => w.length > 3);
        
        for (const word of searchWords) {
          if (word.length < 4) continue; // Skip very short words
          
          const wordIndex = pageTextContent.indexOf(word);
          if (wordIndex !== -1) {
            // Look for nearby words to expand match
            let startPos = Math.max(0, wordIndex - 50);
            let endPos = Math.min(pageTextContent.length, wordIndex + word.length + 150);
            let contextText = pageTextContent.substring(startPos, endPos);
            
            // Count how many words from our search appear in this context
            let matchesInContext = searchWords.filter(w => contextText.includes(w)).length;
            
            if (matchesInContext > 1 && contextText.length > longestMatch.length) {
              longestMatch = contextText;
              longestMatchStart = startPos;
            }
          }
        }
        
        if (longestMatch) {
          matchStart = longestMatchStart;
          cleanSearchText = longestMatch;
          foundMatch = true;
        }
      } else {
        foundMatch = true;
      }
      
      // If we found a match, highlight the relevant elements
      if (foundMatch && matchStart !== -1) {
        const matchEnd = matchStart + cleanSearchText.length;
        
        // Find elements that overlap with the match
        elementTexts.forEach(({element, startIndex, text}) => {
          const endIndex = startIndex + text.length;
          
          // Check if this element overlaps with the match
          if (startIndex <= matchEnd && endIndex >= matchStart) {
            // Highlight this element
            element.classList.add('highlight-text');
          }
        });
        
        // Scroll to the first highlighted element
        setTimeout(() => {
          const highlightElement = document.querySelector('.highlight-text');
          highlightElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else {
        console.log('No match found for text:', cleanSearchText);
        
        // Last resort: highlight some text from the page as a fallback
        if (textElements.length > 0) {
          // Highlight first few text elements as fallback
          for (let i = 0; i < Math.min(3, textElements.length); i++) {
            textElements[i].classList.add('highlight-text');
          }
          
          // Scroll the first element into view
          setTimeout(() => {
            const highlightElement = document.querySelector('.highlight-text');
            highlightElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  };

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

  // We no longer need the changePage function for continuous scrolling

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.2, 2.5));
  }

  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  }
  
  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedTextContent = selection.toString().trim();
      setSelectedText(selectedTextContent);
      
      // Calculate position for popup
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = pdfContainerRef.current?.getBoundingClientRect();
        
        if (containerRect) {
          // Position the popup near the selection
          setPopupPosition({
            top: rect.bottom - containerRect.top + (pdfContainerRef.current?.scrollTop || 0) + 5,
            left: rect.left - containerRect.left + 10
          });
          setIsPopupVisible(true);
        }
      } catch (e) {
        console.error("Error positioning popup:", e);
      }
    } else {
      // Only hide popup if click is outside popup
      // We'll handle this in a separate click handler
    }
  }
  
  // Handle clicking the "Explain" button
  const handleExplainClick = () => {
    if (onTextSelect && selectedText) {
      onTextSelect(selectedText, pageNumber);
    }
    setIsPopupVisible(false);
  }
  
  // Handle clicking the "Cancel" button
  const handleCancelClick = () => {
    setIsPopupVisible(false);
    setSelectedText("");
  }
  
  // Handle clicks outside to close popup
  const handleOutsideClick = (e: MouseEvent) => {
    const popupElement = document.getElementById('selection-popup');
    if (isPopupVisible && popupElement && !popupElement.contains(e.target as Node) && 
        e.target !== popupElement) {
      setIsPopupVisible(false);
    }
  }

  // Add event listeners for text selection and outside click
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (container) {
      container.addEventListener('mouseup', handleTextSelection);
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('mouseup', handleTextSelection);
        document.removeEventListener('mousedown', handleOutsideClick);
      }
    };
  }, [pageNumber, isPopupVisible]); // Re-add listeners when page or popup visibility changes
  
  // Use the custom ref for our methods, but still attach the forwarded ref to the div
  const combinedRef = (el: HTMLDivElement | null) => {
    // Set our internal ref
    if (pdfContainerRef) {
      pdfContainerRef.current = el;
    }
    
    // Forward the ref
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900" ref={combinedRef}>
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
            min-height: 100%;
            padding-bottom: 20px; /* Add some padding at the bottom for better scrolling */
          }
          .react-pdf__Page__textContent {
            width: auto !important;
            height: auto !important;
            top: 0 !important;
            left: 0 !important;
          }
          /* Highlight style for matched text */
          .highlight-text {
            background-color: rgba(255, 255, 0, 0.4);
            border-radius: 2px;
            padding: 0 2px;
            margin: 0 -2px;
          }
        `}</style>
        
        <Document
          file={signedUrl || fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="flex justify-center items-center h-full">Loading PDF...</div>}
          className="pdf-document"
        >
          {!loading && !error && numPages && Array.from(new Array(numPages), (el, index) => (
            <div key={`page_container_${index + 1}`} id={`pdf-page-${index + 1}`} className="mb-4 shadow-lg">
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={getPageWidth()}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="pdf-page"
                data-page-number={index + 1}
                onRenderSuccess={() => {
                  if (currentHighlight && currentHighlight.pageNumber === (index + 1)) {
                    // Apply highlighting after the page is rendered with a small delay
                    setTimeout(() => {
                      highlightTextInDocument(currentHighlight.text, currentHighlight.pageNumber);
                    }, 200);
                  }
                }}
              />
              <div className="text-center text-sm text-gray-500 mt-1 mb-3">
                Page {index + 1} of {numPages}
              </div>
            </div>
          ))}
        </Document>
        
        {/* Selection Popup */}
        {isPopupVisible && popupPosition && (
          <SelectionPopup
            id="selection-popup"
            position={popupPosition}
            onExplain={handleExplainClick}
            onCancel={handleCancelClick}
            isVisible={isPopupVisible}
          />
        )}
      </div>
      
      {/* Controls - Only Zoom */}
      {numPages && !error && (
        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center">
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
});

export default PDFViewerComponent;