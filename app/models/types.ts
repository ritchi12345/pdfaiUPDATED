// Define interface for parsed PDF
export interface ParsedPDF {
  text: string;
  metadata: {
    info: any;
    pageCount: number;
    title?: string;
    author?: string;
    creationDate?: Date;
  };
  chunks: string[];
}

// Source document interface for references
export interface SourceDocument {
  pageContent: string;
  metadata: {
    pageNumber?: number;
    [key: string]: any;
  };
}

// Chat message interface
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sourceDocuments?: SourceDocument[];
}

// Response interface for chat
export interface ChatResponse {
  answer: string;
  sourceDocuments?: SourceDocument[];
}

// Client-side interface for the PDF chat service
export interface PDFChatService {
  isInitialized: boolean;
  sessionId: string;
  askQuestion: (question: string, explanationLevel?: string) => Promise<ChatResponse>;
  getChatHistory: () => Promise<ChatMessage[]>;
  clearChat: () => Promise<boolean>;
}