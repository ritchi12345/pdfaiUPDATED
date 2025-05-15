'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import SelectionPopup from './SelectionPopup';
import {
  ChevronDownIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowsPointingOutIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

// Configure pdfjs worker with fallback options
if (typeof window !== 'undefined') {
  // Try to use our local worker first
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
}

type ZoomMode = 'percentage' | 'fitPage' | 'fitWidth' | 'actualSize' | 'automatic';

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
  const [zoomMode, setZoomMode] = useState<ZoomMode>('automatic');
  const [isZoomDropdownOpen, setIsZoomDropdownOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [currentHighlight, setCurrentHighlight] = useState<{ text: string, pageNumber: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
  const [pageDimensions, setPageDimensions] = useState<{width: number, height: number} | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

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
      
      // We need to process the text to extract meaningful parts for matching
      const originalText = text;
      
      // 1. Break into sentences for sentence-level matching
      const sentences = originalText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
      
      // 2. Extract important keywords (longer words are more distinctive)
      const keywords = originalText.match(/\b[a-zA-Z]{6,}\b/g) || [];
      
      // Get all text spans from the page
      const pageSpans = Array.from(textElements).map(el => ({
        element: el,
        text: el.textContent || ''
      }));
      
      // Combines the text of all spans on the page for searching
      const pageFullText = pageSpans.map(span => span.text).join(' ');
      
      // Elements we'll highlight
      const elementsToHighlight = new Set<Element>();
      let foundMatch = false;
      
      // Try to find significant sentences from the source document
      for (const sentence of sentences) {
        if (sentence.length < 15) continue; // Skip very short sentences
        
        const cleanSentence = sentence.replace(/\s+/g, ' ').trim().toLowerCase();
        
        if (pageFullText.toLowerCase().includes(cleanSentence)) {
          // Find which elements might contain this sentence
          for (const span of pageSpans) {
            if (span.text.toLowerCase().includes(cleanSentence)) {
              elementsToHighlight.add(span.element);
              foundMatch = true;
            }
          }
          
          // If we found a specific sentence match, prioritize it
          if (foundMatch) break;
        }
      }
      
      // If no sentence matches found, try distinctive keyword matching
      if (!foundMatch && keywords.length > 0) {
        // Sort by length (longer words are more distinctive)
        keywords.sort((a, b) => b.length - a.length);
        
        // Take top keywords
        const searchKeywords = keywords.slice(0, 5).map(w => w.toLowerCase());
        
        // Find elements containing these keywords
        for (const span of pageSpans) {
          const spanText = span.text.toLowerCase();
          
          for (const keyword of searchKeywords) {
            if (spanText.includes(keyword)) {
              elementsToHighlight.add(span.element);
              foundMatch = true;
              break;
            }
          }
          
          // Limit number of highlighted elements
          if (elementsToHighlight.size >= 5) break;
        }
      }
      
      // If still no matches, fallback to basic text matching
      if (!foundMatch) {
        // Clean and prepare search text
        let cleanSearchText = originalText.trim().replace(/\s+/g, ' ').toLowerCase();
        
        // If too long, just use the first 100 chars
        if (cleanSearchText.length > 100) {
          cleanSearchText = cleanSearchText.substring(0, 100);
        }
        
        // Try to match this text in the page content
        for (const span of pageSpans) {
          const spanText = span.text.toLowerCase();
          
          // Check for partial matches
          if (spanText.includes(cleanSearchText.substring(0, 20)) || 
              cleanSearchText.includes(spanText)) {
            elementsToHighlight.add(span.element);
            foundMatch = true;
          }
        }
      }
      
      // Last resort - just highlight first few elements on the page
      if (!foundMatch || elementsToHighlight.size === 0) {
        for (let i = 0; i < Math.min(4, pageSpans.length); i++) {
          elementsToHighlight.add(pageSpans[i].element);
        }
      }
      
      // Apply highlights
      elementsToHighlight.forEach(element => {
        element.classList.add('highlight-text');
      });
      
      // Scroll to the first highlighted element
      setTimeout(() => {
        const highlightElement = document.querySelector('.highlight-text');
        const pageElement = document.getElementById(`pdf-page-${textPageNumber}`);
        
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Then scroll to the specific highlight
          setTimeout(() => {
            highlightElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        }
      }, 100);
      
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

  // Function to calculate scale for different modes
  const calculateScale = (mode: ZoomMode, containerWidth?: number, containerHeight?: number, pdfPage?: { width: number; height: number }) => {
    if (!pdfPage || !viewerContainerRef.current) return scale; // Keep current scale if info is missing

    const _containerWidth = containerWidth || viewerContainerRef.current.clientWidth - 20; // Deduct some padding
    const _containerHeight = containerHeight || viewerContainerRef.current.clientHeight - 20; // Deduct some padding

    switch (mode) {
      case 'fitPage':
        // Fit entire page within the container
        return Math.min(_containerWidth / pdfPage.width, _containerHeight / pdfPage.height);
      case 'fitWidth':
        // Fit page width within the container
        return _containerWidth / pdfPage.width;
      case 'actualSize':
        return 1.0;
      case 'automatic':
        // Default to fitWidth or a sensible default like 1.0 if dimensions are odd
        return _containerWidth > 0 && pdfPage.width > 0 ? _containerWidth / pdfPage.width : 1.0;
      case 'percentage':
      default:
        return scale; // Use the manually set scale
    }
  };

  // Effect to adjust scale when zoomMode changes or container resizes
  useEffect(() => {
    if (pageDimensions && zoomMode !== 'percentage' && viewerContainerRef.current) {
      const newScale = calculateScale(zoomMode, viewerContainerRef.current.clientWidth, viewerContainerRef.current.clientHeight, pageDimensions);
      setScale(newScale);
    }
  }, [pageDimensions, zoomMode, windowWidth]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
    // After document loads, if in a 'fit' mode, scale will be adjusted when page dimensions become available
  }
  
  // Handle page load success to get page dimensions for scaling calculations
  const handlePageLoadSuccess = (page: any) => {
    // page proxy object from react-pdf, contains originalWidth, originalHeight
    if (page.originalWidth && page.originalHeight) {
      setPageDimensions({ width: page.originalWidth, height: page.originalHeight });
    }
    
    // Existing highlight logic
    if (currentHighlight && currentHighlight.pageNumber === page._pageIndex + 1) {
      setTimeout(() => {
        highlightTextInDocument(currentHighlight.text, currentHighlight.pageNumber);
      }, 200);
    }
  };

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    console.error('Current URL being used:', signedUrl || fileUrl);
    console.error('File path:', filePath);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }

  // We no longer need the changePage function for continuous scrolling

  function zoomIn() {
    setZoomMode('percentage'); // Switch to percentage mode on manual zoom
    setScale(prevScale => Math.min(prevScale + 0.1, 3.0)); // Max 300%
  }

  function zoomOut() {
    setZoomMode('percentage'); // Switch to percentage mode on manual zoom
    setScale(prevScale => Math.max(prevScale - 0.1, 0.25)); // Min 25%
  }
  
  function setSpecificZoom(newScale: number) {
    setZoomMode('percentage');
    setScale(Math.max(0.25, Math.min(newScale, 3.0)));
    setIsZoomDropdownOpen(false);
  }

  function handleZoomModeChange(mode: ZoomMode) {
    setZoomMode(mode);
    if (mode !== 'percentage' && pageDimensions && viewerContainerRef.current) {
      const newScale = calculateScale(mode, viewerContainerRef.current.clientWidth, viewerContainerRef.current.clientHeight, pageDimensions);
      setScale(newScale);
    }
    setIsZoomDropdownOpen(false);
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
      {/* Controls - Enhanced Zoom - Moved to the top */}
      {numPages && !error && (
        <div className="p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          {/* Page Navigation */}
          {numPages && (
            <div className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300">
              <span>Page</span>
              <input
                type="number"
                value={pageNumber}
                onChange={(e) => {
                  const targetPage = parseInt(e.target.value, 10);
                  if (targetPage >= 1 && targetPage <= numPages) {
                    // Assuming continuous scroll, need to scroll to that page
                    const pageElement = document.getElementById(`pdf-page-${targetPage}`);
                    pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setPageNumber(targetPage);
                  }
                }}
                className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded-md px-1 py-0.5 bg-white dark:bg-gray-800"
                min="1"
                max={numPages}
              />
              <span>of {numPages}</span>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            {/* Zoom Out Button */}
            <button
              onClick={zoomOut}
              disabled={scale <= 0.25 && zoomMode === 'percentage'}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              aria-label="Zoom out"
            >
              <MagnifyingGlassMinusIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Zoom Level Dropdown/Display */}
            <div className="relative">
              <button
                onClick={() => setIsZoomDropdownOpen(!isZoomDropdownOpen)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center min-w-[120px] justify-center"
                aria-label="Zoom options"
              >
                {zoomMode === 'percentage' ? `${Math.round(scale * 100)}%` : 
                  zoomMode === 'fitPage' ? 'Fit Page' :
                  zoomMode === 'fitWidth' ? 'Fit Width' :
                  zoomMode === 'actualSize' ? 'Actual Size' :
                  'Automatic'}
                <ChevronDownIcon className="h-4 w-4 ml-2" />
              </button>
              
              {isZoomDropdownOpen && (
                <div className="absolute top-full mt-2 w-40 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20">
                  {[
                    { label: 'Automatic', mode: 'automatic' as ZoomMode },
                    { label: 'Actual Size', mode: 'actualSize' as ZoomMode },
                    { label: 'Fit Page', mode: 'fitPage' as ZoomMode },
                    { label: 'Fit Width', mode: 'fitWidth' as ZoomMode },
                    { label: '50%', scale: 0.5 },
                    { label: '75%', scale: 0.75 },
                    { label: '100%', scale: 1.0 },
                    { label: '125%', scale: 1.25 },
                    { label: '150%', scale: 1.5 },
                    { label: '200%', scale: 2.0 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => 'mode' in item ? handleZoomModeChange(item.mode) : setSpecificZoom(item.scale!)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {item.label}
                    </button>
                  ))}
                  
                  {/* Custom zoom input */}
                  <div className="p-2 border-t border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      value={zoomMode === 'percentage' ? Math.round(scale * 100) : ""}
                      onChange={(e) => {
                        const newPercentage = parseInt(e.target.value);
                        if (!isNaN(newPercentage)) {
                          setSpecificZoom(newPercentage / 100);
                        }
                      }}
                      onBlur={(e) => {
                        const newPercentage = parseInt(e.target.value);
                        if (!isNaN(newPercentage)) {
                          setSpecificZoom(newPercentage / 100);
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. 85"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Zoom In Button */}
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0 && zoomMode === 'percentage'}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              aria-label="Zoom in"
            >
              <MagnifyingGlassPlusIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}
      
      {/* PDF Container */}
      <div className="flex-1 overflow-auto flex justify-center p-2 pdf-container" ref={viewerContainerRef}>
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
            background-color: rgba(255, 235, 59, 0.7); /* Brighter yellow */
            border-radius: 2px;
            padding: 0 2px;
            margin: 0 -2px;
            position: relative;
            display: inline;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            border-bottom: 2px solid rgba(255, 152, 0, 0.7); /* Orange underline for more visibility */
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
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="pdf-page"
                data-page-number={index + 1}
                onLoadSuccess={handlePageLoadSuccess}
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
    </div>
  );
});

export default PDFViewerComponent;