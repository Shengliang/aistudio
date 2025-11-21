import React, { useState } from 'react';
import { BIBLE_BOOKS, BibleBook } from '../constants/bibleData';
import { Language } from '../types';
import { BookOpen, X, ChevronRight, ChevronDown } from 'lucide-react';

interface BibleNavigationProps {
  language: Language;
  onSelectPassage: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const BibleNavigation: React.FC<BibleNavigationProps> = ({ language, onSelectPassage, isOpen, onClose }) => {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const toggleBook = (bookName: string) => {
    setExpandedBook(expandedBook === bookName ? null : bookName);
  };

  const handleChapterClick = (book: BibleBook, chapter: number) => {
    const bookName = language === 'zh' ? book.zh : book.en;
    const query = `${bookName} ${chapter}`;
    onSelectPassage(query);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:sticky top-0 left-0 h-screen z-40 w-64 bg-white border-r border-bible-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:h-[calc(100vh)] md:top-0
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-bible-100 flex items-center justify-between bg-bible-50">
          <div className="flex items-center gap-2 text-bible-900 font-display font-bold">
            <BookOpen className="w-5 h-5" />
            <span>{language === 'zh' ? '聖經目錄' : 'Bible Index'}</span>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-1 text-bible-400 hover:text-bible-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Book List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {BIBLE_BOOKS.map((book) => {
            const isExpanded = expandedBook === book.en;
            const displayName = language === 'zh' ? book.zh : book.en;

            return (
              <div key={book.en} className="mb-1">
                <button
                  onClick={() => toggleBook(book.en)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isExpanded ? 'bg-bible-100 text-bible-900' : 'text-bible-600 hover:bg-bible-50'}
                  `}
                >
                  <span>{displayName}</span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>

                {/* Chapter Grid */}
                {isExpanded && (
                  <div className="grid grid-cols-5 gap-1 p-2 bg-stone-50 rounded-b-lg animate-fade-in">
                    {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => (
                      <button
                        key={chapter}
                        onClick={() => handleChapterClick(book, chapter)}
                        className="aspect-square flex items-center justify-center rounded hover:bg-bible-200 text-bible-600 text-xs font-medium transition-colors"
                      >
                        {chapter}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default BibleNavigation;