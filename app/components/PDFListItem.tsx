import { useState } from 'react';
import Link from 'next/link';

interface PDFDocument {
  id: string;
  file_name: string;
  file_id: string;
  created_at: string;
}

interface PDFListItemProps {
  document: PDFDocument;
  onDelete: (id: string) => Promise<void>;
}

export default function PDFListItem({ document, onDelete }: PDFListItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this PDF?')) {
      setIsDeleting(true);
      try {
        await onDelete(document.id);
      } catch (error) {
        console.error('Error deleting document:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formattedDate = new Date(document.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-blue-600 dark:text-blue-400">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 2V8H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">{document.file_name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded on {formattedDate}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full md:w-auto">
        <Link
          href={`/chat/${encodeURIComponent(document.file_id)}`}
          className="flex-1 md:flex-none text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Chat with PDF
        </Link>
        
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 md:flex-none px-4 py-2 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
} 