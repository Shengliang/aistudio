import { BIBLE_BOOKS } from '../constants/bibleData';
import { Language } from '../types';

/**
 * Calculates the query for the next or previous chapter based on the current reference.
 * Uses local index data to avoid AI calls for simple navigation.
 */
export const getAdjacentChapterQuery = (currentReference: string, direction: 'next' | 'prev', language: Language): string | null => {
  // Clean reference (remove verses) e.g. "John 3:16" -> "John 3"
  // Matches "Book Name" + spaces + "ChapterNumber"
  const cleanRef = currentReference.replace(/[:：].*$/, '').trim(); 

  // Regex match: Group 1 is text (Book Name), Group 2 is digits (Chapter)
  // Handle cases like "1 John 3" or "創世記 1"
  const match = cleanRef.match(/^(.+?)\s*(\d+)$/);
  
  if (!match) return null;

  const bookNameStr = match[1].trim();
  const currentChapter = parseInt(match[2], 10);

  if (isNaN(currentChapter)) return null;

  // Find book in constant (Case insensitive for English)
  const bookIndex = BIBLE_BOOKS.findIndex(b => 
    b.en.toLowerCase() === bookNameStr.toLowerCase() || 
    b.zh === bookNameStr
  );

  if (bookIndex === -1) return null;

  const currentBook = BIBLE_BOOKS[bookIndex];
  let targetBookIndex = bookIndex;
  let targetChapter = currentChapter;

  if (direction === 'next') {
    targetChapter++;
    if (targetChapter > currentBook.chapters) {
      // Move to next book
      targetBookIndex++;
      targetChapter = 1;
    }
  } else {
    targetChapter--;
    if (targetChapter < 1) {
      // Move to prev book
      targetBookIndex--;
      if (targetBookIndex >= 0) {
        // Go to last chapter of prev book
        targetChapter = BIBLE_BOOKS[targetBookIndex].chapters;
      }
    }
  }

  // Check bounds (Start of Genesis or End of Revelation)
  if (targetBookIndex < 0 || targetBookIndex >= BIBLE_BOOKS.length) {
    return null;
  }

  const targetBook = BIBLE_BOOKS[targetBookIndex];
  const targetName = language === 'zh' ? targetBook.zh : targetBook.en;

  return `${targetName} ${targetChapter}`;
};