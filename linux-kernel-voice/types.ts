
export interface TopicContent {
  title: string;
  overview: string;
  techStack: string; // e.g. "MySQL 8.0 / C++"
  lectureScript?: string; // The full Teacher/Student dialogue
}

export interface SearchResult {
  topic: TopicContent;
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
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface PlaylistItem {
  text: string;
  voice: VoiceName;
  role: 'Teacher' | 'Student' | 'Narrator';
  codeSnippet?: string; // New field for source code
}

export type Language = 'en' | 'zh';
