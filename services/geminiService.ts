import { GoogleGenAI, Modality, Type } from "@google/genai";
import { BiblePassage, SearchResult, VoiceName, Language } from "../types";
import { decodeBase64, pcmToWav } from "../utils/audioUtils";

// Initialize Gemini
// NOTE: API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STORAGE_KEY = 'scripture_voice_cache_v1';

// Load cache from LocalStorage
const loadCache = (): Map<string, SearchResult> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Convert Array back to Map
      return new Map(JSON.parse(stored));
    }
  } catch (e) {
    console.warn("Failed to load cache from local storage", e);
  }
  return new Map();
};

// Initialize cache
const searchCache = loadCache();

// Helper to save cache to LocalStorage
const persistCache = () => {
  try {
    // Limit cache size to avoid QuotaExceededError (keep last 20 items)
    if (searchCache.size > 20) {
      const keysIter = searchCache.keys();
      const keysToDelete = [];
      // Delete oldest keys until we are down to 20
      while (searchCache.size > 20) {
        const key = keysIter.next().value;
        if (key) searchCache.delete(key);
      }
    }
    // Convert Map to Array for JSON serialization
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(searchCache.entries())));
  } catch (e) {
    console.warn("Failed to save cache to local storage", e);
  }
};

/**
 * Searches for a Bible passage based on a natural language query using Gemini 2.5 Flash.
 */
export const searchBiblePassage = async (
  query: string, 
  language: Language = 'en',
  lengthMinutes: number = 1
): Promise<SearchResult> => {
  // Create a unique cache key
  const cacheKey = `${query.trim().toLowerCase()}-${language}-${lengthMinutes}`;
  
  if (searchCache.has(cacheKey)) {
    console.log("Serving from persistent cache:", cacheKey);
    return searchCache.get(cacheKey)!;
  }

  try {
    // Estimate word count: approx 160 words per minute of speaking
    const targetWordCount = Math.max(100, lengthMinutes * 160);
    
    const langPrompt = language === 'zh' 
      ? `Return the result in Traditional Chinese (using Chinese Union Version for text). The 'context' must be a deep devotional (approx ${targetWordCount} words) in Traditional Chinese.` 
      : `Return the result in English (e.g. NIV/ESV). The 'context' must be a deep devotional (approx ${targetWordCount} words).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find the most relevant Bible passage for: "${query}".
      ${langPrompt}
      
      Return the result in JSON format containing:
      1. 'reference' (e.g., Psalm 23:1-4)
      2. 'text' (full text of the verses)
      3. 'version' (e.g., NIV, CUV)
      4. 'context': A detailed, inspiring devotional or sermonette explaining this passage. It MUST be approximately ${targetWordCount} words long to provide about ${lengthMinutes} minutes of reading/listening time. Include historical background, theological depth, and practical application.
      5. 'summary': A very short 1-sentence summary.`,
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
                context: { type: Type.STRING },
              },
              required: ["reference", "text", "version", "context"],
            },
            summary: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    const result = JSON.parse(text) as SearchResult;
    
    // Store in cache and persist
    searchCache.set(cacheKey, result);
    persistCache();
    
    return result;

  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

/**
 * Generates a photorealistic image based on the bible verse text.
 */
export const generateBibleImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A highly detailed, cinematic, and respectful biblical illustration suitable for a study bible. 
      Visualizing this text: "${prompt}". 
      Style: Oil painting, dramatic lighting, masterpiece, 8k resolution.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) throw new Error("No image generated.");
    
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

/**
 * Generates speech for a specific text segment using Gemini 2.5 Flash TTS.
 * Used for streaming chunks of text.
 */
export const generateSegmentSpeech = async (
  text: string,
  voice: VoiceName
): Promise<string> => {
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
    
    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    const pcmData = decodeBase64(base64Audio);
    const wavBlob = pcmToWav(pcmData, 24000);
    
    return URL.createObjectURL(wavBlob);

  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};