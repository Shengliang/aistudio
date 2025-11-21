import { GoogleGenAI, Modality, Type } from "@google/genai";
import { BiblePassage, SearchResult, VoiceName, Language, HistoryItem } from "../types";
import { decodeBase64, pcmToWav } from "../utils/audioUtils";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We use a versioned key to allow breaking changes in the future without crashing
const STORAGE_KEY = 'scripture_voice_cache_v3';

// Load cache from LocalStorage
const loadCache = (): Map<string, any> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Map(JSON.parse(stored));
    }
  } catch (e) {
    console.warn("Failed to load cache from local storage", e);
  }
  return new Map();
};

const searchCache = loadCache();

const persistCache = () => {
  try {
    // Limit cache size. LocalStorage is usually 5MB.
    // Images are heavy, so we need to be aggressive with cleanup if quota is hit.
    if (searchCache.size > 100) {
      // Delete oldest 20 items
      const keys = Array.from(searchCache.keys());
      for (let i = 0; i < 20; i++) {
        searchCache.delete(keys[i]);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(searchCache.entries())));
  } catch (e) {
    console.warn("LocalStorage quota exceeded. Cleaning up old entries...");
    // Emergency cleanup: Clear half the cache
    try {
      const keys = Array.from(searchCache.keys());
      for (let i = 0; i < Math.floor(keys.length / 2); i++) {
        searchCache.delete(keys[i]);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(searchCache.entries())));
    } catch (e2) {
      console.error("Failed to save cache even after cleanup", e2);
    }
  }
};

// --- Cache Management API ---

export const checkCacheExistence = (query: string, language: Language): SearchResult | null => {
  const cacheKey = `verse_v1_${language}_${query.trim().toLowerCase()}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as SearchResult;
  }
  return null;
};

export const getSavedHistory = (language: Language): HistoryItem[] => {
  const history: HistoryItem[] = [];
  
  searchCache.forEach((value, key) => {
    if (key.startsWith(`verse_v1_${language}_`)) {
      const result = value as SearchResult;
      history.push({
        key: key,
        query: key.split('_').pop() || 'Unknown',
        reference: result.passage.reference,
        timestamp: result.timestamp || Date.now(),
        language: language
      });
    }
  });

  // Sort by newest first
  return history.sort((a, b) => b.timestamp - a.timestamp);
};

export const getCachedImage = (text: string): string | null => {
  // Use a hash or simplified text as key
  const key = `img_v1_${text.substring(0, 50).replace(/\s+/g, '')}`;
  return searchCache.get(key) || null;
};

// --- API Functions ---

export const searchVerseOnly = async (
  query: string,
  language: Language = 'en',
  forceRefresh: boolean = false
): Promise<SearchResult> => {
  const cacheKey = `verse_v1_${language}_${query.trim().toLowerCase()}`;
  
  if (!forceRefresh && searchCache.has(cacheKey)) {
    console.debug("Cache hit for verse:", query);
    return searchCache.get(cacheKey) as SearchResult;
  }

  try {
    if (!navigator.onLine) {
      throw new Error(language === 'zh' ? "目前離線，且無此經文緩存。" : "You are offline and this verse is not cached.");
    }

    const langPrompt = language === 'zh' 
      ? `Return result in Traditional Chinese (Chinese Union Version).` 
      : `Return result in English (NIV/ESV).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find the single most relevant Bible passage for: "${query}".
      ${langPrompt}
      Return ONLY the bible text in JSON format. No devotional context yet.
      Fields: 'reference', 'text', 'version', 'summary' (1 sentence).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passage: {
              type: Type.OBJECT,
              properties: {
                reference: { type: Type.STRING },
                text: { type: Type.STRING },
                version: { type: Type.STRING },
              },
              required: ["reference", "text", "version"],
            },
            summary: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    const result = JSON.parse(text) as SearchResult;
    
    // Add timestamp
    result.timestamp = Date.now();
    
    // Cache the result
    searchCache.set(cacheKey, result);
    persistCache();
    
    return result;
  } catch (error) {
    console.error("Verse search error:", error);
    throw error;
  }
};

export const generateDevotional = async (
  reference: string,
  bibleText: string,
  language: Language,
  lengthMinutes: number,
  forceRefresh: boolean = false
): Promise<string> => {
  const cacheKey = `context_v1_${language}_${lengthMinutes}_${reference.replace(/\s+/g, '_')}`;
  
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as string;
  }
  
  try {
    if (!navigator.onLine) return ""; // Return empty if offline and not cached

    const targetWordCount = Math.max(100, lengthMinutes * 160);
    const langPrompt = language === 'zh' 
      ? `Write in Traditional Chinese.` 
      : `Write in English.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a deep, inspiring devotional for this Bible passage:
      Reference: ${reference}
      Text: "${bibleText}"
      
      ${langPrompt}
      Requirements:
      - Historical background
      - Theological depth
      - Practical application
      - Length: Approximately ${targetWordCount} words (for ${lengthMinutes} minutes reading).
      - Tone: Warm, pastoral, encouraging.`,
      config: {
        responseMimeType: "text/plain", 
      },
    });

    const text = response.text || "";
    
    if (text) {
      searchCache.set(cacheKey, text);
      persistCache();
    }

    return text;
  } catch (error) {
    console.error("Devotional generation error:", error);
    return language === 'zh' 
      ? "暫時無法生成靈修內容。" 
      : "Could not generate devotional content at this time.";
  }
};

export const generateSongLyrics = async (
  reference: string,
  bibleText: string,
  language: Language
): Promise<string> => {
  const cacheKey = `song_v2_${language}_${reference.replace(/\s+/g, '_')}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as string;
  }

  try {
    if (!navigator.onLine) throw new Error("Offline");

    const langPrompt = language === 'zh' 
      ? `Write lyrics in Traditional Chinese.` 
      : `Write lyrics in English.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a Creative Song Transcript (Lyrics) based on this scripture:
      Reference: ${reference}
      Text: "${bibleText}"
      ${langPrompt}
      Include Title, Verses, Chorus, Bridge.`,
      config: {
        responseMimeType: "text/plain",
      },
    });

    const text = response.text || "";
    if (text) {
      searchCache.set(cacheKey, text);
      persistCache();
    }
    return text;
  } catch (error) {
    throw error;
  }
};

export const generateBibleImage = async (prompt: string): Promise<string> => {
  const cacheKey = `img_v1_${prompt.substring(0, 50).replace(/\s+/g, '')}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as string;
  }

  try {
    if (!navigator.onLine) throw new Error("Offline");

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A highly detailed, cinematic, and respectful biblical illustration. Visualizing: "${prompt}". Style: Oil painting, masterpiece.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) throw new Error("No image generated.");
    
    const url = `data:image/jpeg;base64,${base64ImageBytes}`;
    
    // Try to cache the image. If it fails (quota), we catch it in persistCache
    searchCache.set(cacheKey, url);
    persistCache();

    return url;
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

export const generateSegmentSpeech = async (
  text: string,
  voice: VoiceName
): Promise<string> => {
  // Audio is heavy and blob URLs are temporary, so we rely on browser cache or RAM for now
  // to keep localStorage clean.
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from Gemini.");

    const pcmData = decodeBase64(base64Audio);
    const wavBlob = pcmToWav(pcmData, 24000);
    
    return URL.createObjectURL(wavBlob);
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};