'use server';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
  ConversationalRetrievalQAChain,
  loadQARefineChain
} from 'langchain/chains';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { AIMessage, HumanMessage } from 'langchain/schema';
import { ParsedPDF } from './pdfParser';

// Initialize environment variables (should be set in .env.local)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. LangChain service will not work properly.');
}

// Store active chat sessions
const activeSessions: Record<string, PDFChatServiceImpl> = {};

/**
 * Splits the PDF text into chunks for processing
 */
async function splitTextIntoChunks(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  return await splitter.splitText(text);
}

/**
 * Creates a vector store from the PDF text chunks
 */
async function createVectorStore(chunks: string[]) {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
    });
    
    return await MemoryVectorStore.fromTexts(
      chunks,
      {},
      embeddings
    );
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw new Error('Failed to create vector store for PDF content');
  }
}

/**
 * Server-side implementation of the PDF Chat Service
 */
class PDFChatServiceImpl {
  private vectorStore: MemoryVectorStore | null = null;
  private chatHistory: (HumanMessage | AIMessage)[] = [];
  private chain: ConversationalRetrievalQAChain | null = null;
  
  /**
   * Initializes the service with a parsed PDF
   */
  async initialize(parsedPDF: ParsedPDF) {
    try {
      // Get chunks from parsed PDF or split the text
      const chunks = parsedPDF.chunks.length > 0 
        ? parsedPDF.chunks 
        : await splitTextIntoChunks(parsedPDF.text);
      
      // Create the vector store
      this.vectorStore = await createVectorStore(chunks);
      
      // Initialize the chat model
      const model = new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0.2,
        openAIApiKey: OPENAI_API_KEY,
      });
      
      // Create the chain
      const qaChain = loadQARefineChain(model);
      
      // Initialize the conversational retrieval chain
      this.chain = ConversationalRetrievalQAChain.fromLLM(
        model,
        this.vectorStore.asRetriever(),
        {
          returnSourceDocuments: true,
          qaChain,
          outputParser: new StringOutputParser(),
        }
      );
      
      // Clear chat history
      this.chatHistory = [];
      
      return true;
    } catch (error) {
      console.error('Error initializing PDFChatService:', error);
      throw new Error('Failed to initialize PDF chat service');
    }
  }
  
  /**
   * Asks a question about the PDF
   */
  async askQuestion(question: string): Promise<string> {
    if (!this.vectorStore || !this.chain) {
      throw new Error('PDF Chat Service not initialized. Call initialize() first.');
    }
    
    try {
      // Add the human message to the chat history
      this.chatHistory.push(new HumanMessage(question));
      
      // Get the answer using the chain
      const response = await this.chain.call({
        question,
        chat_history: this.chatHistory,
      });
      
      // Extract the answer
      const answer = response.text || 'I couldn\'t find an answer to that question in the document.';
      
      // Add the AI message to the chat history
      this.chatHistory.push(new AIMessage(answer));
      
      return answer;
    } catch (error) {
      console.error('Error asking question:', error);
      throw new Error('Failed to process your question');
    }
  }
  
  /**
   * Gets the chat history
   */
  getChatHistory() {
    return this.chatHistory.map(msg => ({
      role: msg._getType() === 'human' ? 'user' : 'assistant',
      content: msg.content,
    }));
  }
  
  /**
   * Clears the chat history
   */
  clearChatHistory() {
    this.chatHistory = [];
  }
  
  /**
   * Checks if the service is initialized
   */
  isInitialized(): boolean {
    return this.vectorStore !== null && this.chain !== null;
  }
}

/**
 * Server action to initialize a new chat session
 */
export async function initializeChatSession(parsedPDF: ParsedPDF, sessionId: string): Promise<boolean> {
  try {
    const service = new PDFChatServiceImpl();
    await service.initialize(parsedPDF);
    activeSessions[sessionId] = service;
    return true;
  } catch (error) {
    console.error('Error initializing chat session:', error);
    throw new Error('Failed to initialize chat session');
  }
}

/**
 * Server action to ask a question in a chat session
 */
export async function askQuestionInSession(question: string, sessionId: string): Promise<string> {
  const service = activeSessions[sessionId];
  
  if (!service) {
    throw new Error('Session not found. Please upload a PDF first.');
  }
  
  return await service.askQuestion(question);
}

/**
 * Server action to get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<any[]> {
  const service = activeSessions[sessionId];
  
  if (!service) {
    return [];
  }
  
  return service.getChatHistory();
}

/**
 * Server action to clear a chat session
 */
export async function clearChatSession(sessionId: string): Promise<boolean> {
  if (activeSessions[sessionId]) {
    delete activeSessions[sessionId];
    return true;
  }
  return false;
}