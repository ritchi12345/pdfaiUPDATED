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

// Chat message interface
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Client-side interface for the PDF chat service
export interface PDFChatService {
  isInitialized: boolean;
  sessionId: string;
  askQuestion: (question: string) => Promise<string>;
  getChatHistory: () => Promise<ChatMessage[]>;
  clearChat: () => Promise<boolean>;
}