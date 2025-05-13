'use client';

interface SelectionPopupProps {
  position: { top: number; left: number };
  onExplain: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export default function SelectionPopup({
  position,
  onExplain,
  onCancel,
  isVisible,
  id
}: SelectionPopupProps & { id?: string }) {
  if (!isVisible) return null;

  return (
    <div
      id={id}
      className="absolute z-50 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 flex gap-2 border border-gray-300 dark:border-gray-600"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
    >
      <button
        onClick={onExplain}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Explain
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
      >
        Cancel
      </button>
    </div>
  );
}