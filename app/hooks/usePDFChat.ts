'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ParsedPDF, PDFChatService, ChatMessage } from '../models/types';
import { initializeChatSession, askQuestionInSession, getChatHistory, clearChatSession } from '../services/langchainService';

export function usePDFChat(): {
  chatService: PDFChatService | null;
  isInitializing: boolean;
  error: string | null;
  initializeChat: (file: File) => Promise<boolean>;
} {
  const [sessionId] = useState<string>(() => uuidv4());
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the chat service with a PDF file
  const initializeChat = useCallback(async (file: File): Promise<boolean> => {
    setIsInitializing(true);
    setError(null);
    
    try {
      // Create a FormData object to upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      
      // Upload the PDF and initialize the session
      const response = await fetch('/api/chat', {
        method: 'PUT',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize chat');
      }
      
      setIsInitialized(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [sessionId]);

  // Ask a question to the PDF
  const askQuestion = useCallback(async (question: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          sessionId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process question');
      }
      
      const data = await response.json();
      return data.answer;
    } catch (err: any) {
      throw new Error(err.message || 'An error occurred');
    }
  }, [sessionId]);

  // Get chat history
  const getChatHistoryFromSession = useCallback(async (): Promise<ChatMessage[]> => {
    try {
      const response = await fetch(`/api/chat/history?sessionId=${sessionId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.history || [];
    } catch (err) {
      return [];
    }
  }, [sessionId]);

  // Clear chat history
  const clearChat = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chat?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        return false;
      }
      
      return true;
    } catch (err) {
      return false;
    }
  }, [sessionId]);

  // Create the chat service object
  const chatService: PDFChatService | null = isInitialized ? {
    isInitialized,
    sessionId,
    askQuestion,
    getChatHistory: getChatHistoryFromSession,
    clearChat,
  } : null;

  return {
    chatService,
    isInitializing,
    error,
    initializeChat,
  };
}