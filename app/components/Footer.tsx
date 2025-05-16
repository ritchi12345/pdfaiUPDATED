'use client';

import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="w-full p-8 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <Logo size="sm" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Chat with your PDF documents and get insights instantly.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Product</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li><Link href="#features" className="hover:text-purple-600 dark:hover:text-purple-400">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-purple-600 dark:hover:text-purple-400">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-purple-600 dark:hover:text-purple-400">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li><Link href="/docs" className="hover:text-purple-600 dark:hover:text-purple-400">Documentation</Link></li>
              <li><Link href="/api-reference" className="hover:text-purple-600 dark:hover:text-purple-400">API Reference</Link></li>
              <li><Link href="/blog" className="hover:text-purple-600 dark:hover:text-purple-400">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li><Link href="/about" className="hover:text-purple-600 dark:hover:text-purple-400">About</Link></li>
              <li><Link href="/contact" className="hover:text-purple-600 dark:hover:text-purple-400">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-purple-600 dark:hover:text-purple-400">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">PDFmate - Powered by Next.js, LangChain, and OpenAI</p>
          <p>© {new Date().getFullYear()} PDFmate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 