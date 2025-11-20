export interface BiblePassage {
  reference: string;
  text: string;
  version: string;
  context?: string;
}

export interface SearchResult {
  passage: BiblePassage;
  summary: string;
  timestamp?: number;
}

export interface HistoryItem {
  key: string;
  query: string;
  reference: string;
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

export interface AudioState {
  blobUrl: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export type Language = 'en' | 'zh';