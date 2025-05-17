'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFUpload from './components/PDFUpload';
import Logo from './components/Logo';
import Header from './components/Header';
import Footer from './components/Footer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { useAuth } from './components/AuthProvider';

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
<<<<<<< HEAD
  const { session, isLoading } = useAuth();

  const handleFileUpload = async (file: File | null) => {
    // Check authentication status
    if (isLoading) {
      // Auth is still loading, don't proceed yet
      setError("Checking authentication status...");
      return;
    }
    
    // Redirect unauthenticated users to login
    if (!session || !file) {
      router.push('/login?redirect=/');
=======
  const { session } = useAuth();

  const handleFileUpload = async (file: File) => {
    // Check if user is authenticated
    if (!session) {
      router.push('/login');
>>>>>>> fda7b1acfca1ab44972ff427a428f7cc66921f53
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Create a unique identifier for this PDF
    const pdfId = uuidv4();
    formData.append('pdfId', pdfId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload PDF');
      }

      const result = await response.json();
      
      // Navigate to the chat page with the file ID
      router.push(`/chat/${encodeURIComponent(result.fileId)}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <Header />

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Chat with any PDF document</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              From legal agreements to financial reports, PDFmate brings your documents to life.
              Ask questions, get summaries, find information, and more.
            </p>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4">Upload your PDF</h3>
              
              <PDFUpload 
                onFileUpload={handleFileUpload} 
                isAuthenticated={!!session} 
                isAuthLoading={isLoading} 
              />
              
              {isUploading && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <p className="ml-2 text-sm text-gray-600 dark:text-gray-400">Uploading PDF...</p>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center text-sm text-gray-500">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Your documents are secure and private</span>
            </div>
          </div>
          <div className="hidden md:block relative h-[400px] rounded-xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm z-0"></div>
            <div className="relative z-10 p-6 h-full flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="ml-2 text-sm text-gray-500">PDF Conversation</div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm">What are the key findings in this report?</p>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg max-w-[80%] ml-auto">
                    <p className="text-sm">The key findings include a 23% increase in revenue, expansion into 3 new markets, and improved customer satisfaction scores from 78% to 92%.</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm">Can you summarize the recommendations?</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-8 bg-purple-50 dark:bg-gray-800/30 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loved by 1,500,000+ happy users and counting!</p>
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 md:py-24 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Features</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Everything you need to interact with your PDF documents intelligently</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload documents</h3>
            <p className="text-gray-600 dark:text-gray-300">Easily upload the PDF documents you'd like to chat with.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant answers</h3>
            <p className="text-gray-600 dark:text-gray-300">Ask questions, extract information, and summarize documents with AI.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Sources included</h3>
            <p className="text-gray-600 dark:text-gray-300">Every response is backed by sources extracted from the uploaded document.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 font-bold">1</div>
                <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
                <p className="text-gray-600 dark:text-gray-300">Upload your PDF documents easily through our interface.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-[2px] bg-gray-300 dark:bg-gray-700"></div>
            </div>
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 font-bold">2</div>
                <h3 className="text-lg font-semibold mb-2">AI Processing</h3>
                <p className="text-gray-600 dark:text-gray-300">Our AI will process and analyze the content of your document.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-[2px] bg-gray-300 dark:bg-gray-700"></div>
            </div>
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 font-bold">3</div>
                <h3 className="text-lg font-semibold mb-2">Chat Interface</h3>
                <p className="text-gray-600 dark:text-gray-300">You'll be redirected to a chat interface for your document.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-[2px] bg-gray-300 dark:bg-gray-700"></div>
            </div>
            <div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 font-bold">4</div>
                <h3 className="text-lg font-semibold mb-2">Get Answers</h3>
                <p className="text-gray-600 dark:text-gray-300">Ask questions and get accurate answers based on your document's content.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-16 md:py-24 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Built for any use case</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Academic Research</h3>
              <p className="text-gray-600 dark:text-gray-300">Analyze research papers, extract key findings, and find connections between different studies.</p>
            </div>
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Legal Documents</h3>
              <p className="text-gray-600 dark:text-gray-300">Review contracts, identify key clauses, and understand legal implications of documents.</p>
            </div>
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Financial Reports</h3>
              <p className="text-gray-600 dark:text-gray-300">Extract financial data, understand trends, and get insights from annual reports.</p>
            </div>
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">User Manuals</h3>
              <p className="text-gray-600 dark:text-gray-300">Get answers about product features, troubleshooting, and usage instructions.</p>
            </div>
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Employee Training</h3>
              <p className="text-gray-600 dark:text-gray-300">Help employees quickly find information in training materials and company policies.</p>
            </div>
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Medical Literature</h3>
              <p className="text-gray-600 dark:text-gray-300">Analyze medical papers, extract findings, and understand complex medical information.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-purple-100 dark:bg-purple-900/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to chat with your PDF?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Upload your document and start getting insights immediately.</p>
          <a 
            href={session ? "/upload" : "/login"} 
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-lg font-medium transition-colors inline-block"
          >
            Get Started Free
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}