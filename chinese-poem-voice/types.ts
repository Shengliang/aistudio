
export interface TopicResult {
  topic: {
    title: string;
    techStack: string;
    overview: string;
  };
  script: string; // The full conversation
  timestamp?: number;
}

export interface SearchResult {
  topic: {
    title: string;
    techStack: string;
    overview: string;
  };
  passage: {
    reference: string; // Kept for compatibility with some components
    text: string;
    context?: string;
  };
  timestamp?: number;
}

export interface HistoryItem {
  key: string;
  query: string;
  title: string;
  timestamp: number;
  language: Language;
}

export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir', // Teacher
  Zephyr = 'Zephyr',
}

export interface PlaylistItem {
  text: string;
  voice: VoiceName;
  role: 'Teacher' | 'Student';
  codeSnippet?: string; // C/C++ Code snippet associated with this chunk
}

export type Language = 'en' | 'zh';
