'use server';

// Import pdf-parse with explicit require to avoid potential path issues
import * as pdfParseLib from 'pdf-parse';
const pdfParse = pdfParseLib.default || pdfParseLib;
import { ParsedPDF } from '../models/types';

/**
 * Parses a PDF file and extracts its content and metadata
 * @param file The PDF file to parse
 * @returns Promise resolving to a ParsedPDF object
 */
export async function parsePDF(file: File): Promise<ParsedPDF> {
  // Convert File to ArrayBuffer
  const buffer = await file.arrayBuffer();
  
  try {
    // Use pdf-parse to extract text and metadata
    const data = await pdfParse(new Uint8Array(buffer));
    
    // Extract metadata
    const metadata = {
      info: data.info || {},
      pageCount: data.numpages || 0,
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
      creationDate: data.info?.CreationDate 
        ? new Date(data.info.CreationDate) 
        : undefined,
    };
    
    // Split text into chunks (approximately 1000 characters each)
    const chunkSize = 1000;
    const text = data.text || '';
    const chunks = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return {
      text,
      metadata,
      chunks,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Validates a file to ensure it is a valid PDF
 * @param file The file to validate
 * @returns Boolean indicating if the file is valid
 */
export async function validatePDFFile(file: File): Promise<boolean> {
  // Check file type
  if (file.type !== 'application/pdf') {
    return false;
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return false;
  }

  return true;
}

/**
 * Extracts text from a specific page of a PDF
 * @param file The PDF file
 * @param pageNum The page number to extract (1-based index)
 * @returns Promise resolving to the text content of the specified page
 */
export async function extractPageText(file: File, pageNum: number): Promise<string> {
  const buffer = await file.arrayBuffer();

  try {
    const options = {
      max: pageNum, // Parse up to this page
      pagerender: async (pageData: any) => {
        if (pageData.pageIndex === pageNum - 1) {
          return pageData.getTextContent();
        }
        // Skip other pages
        return Promise.resolve();
      }
    };

    const data = await pdfParse(new Uint8Array(buffer), options);
    return data.text || '';
  } catch (error) {
    console.error(`Error extracting text from page ${pageNum}:`, error);
    throw new Error(`Failed to extract text from page ${pageNum}`);
  }
}