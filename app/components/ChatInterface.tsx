'use client';

import { useState, useRef, useEffect } from 'react';
import { SourceDocument, ChatResponse } from '../models/types';
import { motion, AnimatePresence } from 'framer-motion';

// Available explanation levels
export type ExplanationLevel = "5 y.o" | "Middle Schooler" | "High Schooler" | "Undergrad" | "Expert";
export const EXPLANATION_LEVELS: ExplanationLevel[] = ["5 y.o", "Middle Schooler", "High Schooler", "Undergrad", "Expert"];

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sourceDocuments?: SourceDocument[];
}

interface ChatInterfaceProps {
  onSendMessage: (message: string, level: ExplanationLevel) => Promise<ChatResponse>;
  isReady: boolean;
  initialMessages?: Message[];
  onReferenceClick?: (sourceDoc: SourceDocument, index: number) => void;
  selectedLevel?: ExplanationLevel;
  onLevelChange?: (level: ExplanationLevel) => void;
  ref?: React.ForwardedRef<{
    sendMessage: (message: string) => Promise<void>;
  }>;
}

import { forwardRef, useImperativeHandle } from 'react';

export type ChatInterfaceRef = {
  sendMessage: (message: string) => Promise<void>;
};

const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ 
  onSendMessage, 
  isReady, 
  initialMessages = [],
  onReferenceClick,
  selectedLevel: propSelectedLevel,
  onLevelChange
}, ref) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<ExplanationLevel>("High Schooler");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use the prop value if provided, otherwise use the internal state
  const selectedLevel = propSelectedLevel || currentLevel;
  
  // Function to programmatically send a message
  const sendMessage = async (message: string) => {
    if (!isReady || isLoading) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // Show loading state
    setIsLoading(true);
    
    try {
      // Get response from the callback function with the selected level
      const response = await onSendMessage(message, selectedLevel);
      
      // Add assistant message to chat with source documents
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: response.answer,
          sourceDocuments: response.sourceDocuments
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        { 
          role: 'system', 
          content: 'Sorry, there was an error processing your message. Please try again.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    sendMessage
  }));
  
  // Handle level change
  const handleLevelChange = (level: ExplanationLevel) => {
    if (onLevelChange) {
      onLevelChange(level);
    } else {
      setCurrentLevel(level);
    }
  };
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !isReady || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Use the sendMessage function to handle the message
    await sendMessage(userMessage);
  };
  
  return (
    <div className="flex flex-col h-full w-full border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Ask a question about your PDF</p>
            </div>
          </div>
        )}
        
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              layout
            >
              <motion.div 
                className={`max-w-[75%] px-4 py-2 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : message.role === 'system'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-bl-none'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Show source references for assistant messages */}
                {message.role === 'assistant' && message.sourceDocuments && message.sourceDocuments.length > 0 && (
                  <motion.div 
                    className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-xs font-semibold mb-1">References:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.sourceDocuments.map((doc, idx) => (
                        <motion.button
                          key={idx}
                          onClick={() => onReferenceClick && onReferenceClick(doc, idx)}
                          className="text-xs bg-gray-300 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + (idx * 0.1) }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Ref {idx + 1}
                          {doc.metadata?.pageNumber ? ` (Page ${doc.metadata.pageNumber})` : ''}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            className="flex justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <div className="max-w-[75%] px-4 py-2 rounded-lg bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-bl-none">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950">
        {/* Explanation Level Selector */}
        <motion.div 
          className="mb-3 flex flex-wrap justify-center items-center gap-1 sm:gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-xs text-gray-600 dark:text-gray-400 mr-1">Explain like I'm:</span>
          <div className="flex flex-wrap rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            {EXPLANATION_LEVELS.map((level, idx) => (
              <motion.button
                key={level}
                onClick={() => handleLevelChange(level)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedLevel === level
                    ? 'bg-blue-500 text-white font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (idx * 0.05) }}
              >
                {level}
              </motion.button>
            ))}
          </div>
        </motion.div>
        
        <motion.form 
          onSubmit={handleSubmit} 
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isReady ? "Ask a question about your PDF..." : "Upload a PDF to get started..."}
            disabled={!isReady || isLoading}
            className="flex-1 py-2 px-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            whileFocus={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
          <motion.button
            type="submit"
            disabled={!isReady || isLoading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
});

export default ChatInterface;