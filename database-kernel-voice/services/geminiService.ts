
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SearchResult, VoiceName, Language, HistoryItem, TopicResult } from "../types";
import { decodeBase64, pcmToWav } from "../utils/audioUtils";

const ai = new GoogleGenAI({ 
  apiKey: typeof window !== 'undefined' && localStorage.getItem('user_api_key') 
    ? localStorage.getItem('user_api_key') || "" 
    : process.env.API_KEY 
});
const STORAGE_KEY = 'db_voice_cache_v1';
const CLIENT_VERSION = "6.5.0-DBKernel";

// --- Cache Logic ---
const loadCache = (): Map<string, any> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Map(JSON.parse(stored)) : new Map();
  } catch (e) { return new Map(); }
};
const searchCache = loadCache();

const persistCache = () => {
  try {
    if (searchCache.size > 50) {
      const keys = Array.from(searchCache.keys());
      for (let i = 0; i < 10; i++) searchCache.delete(keys[i]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(searchCache.entries())));
  } catch (e) { searchCache.clear(); }
};

// --- Helper ---
const cleanJson = (text: string): string => {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*|\s*```/g, '');
  // Find the first '{' and last '}' to ensure we have a valid object
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned;
};

// --- API Functions ---

export const checkCacheExistence = (query: string, language: Language): SearchResult | null => {
  const cacheKey = `topic_db_v1_${language}_${query.trim().toLowerCase()}`;
  return searchCache.has(cacheKey) ? searchCache.get(cacheKey) : null;
};

export const getSavedHistory = (language: Language): HistoryItem[] => {
  const history: HistoryItem[] = [];
  searchCache.forEach((value, key) => {
    if (key.startsWith(`topic_db_v1_${language}_`)) {
      const result = value as SearchResult;
      history.push({
        key,
        query: key.split('_').pop() || 'Unknown',
        title: result.topic.title,
        timestamp: result.timestamp || Date.now(),
        language
      });
    }
  });
  return history.sort((a, b) => b.timestamp - a.timestamp);
};

export const searchDBTopic = async (
  query: string,
  language: Language = 'en',
  lengthMinutes: number = 3,
  forceRefresh: boolean = false
): Promise<SearchResult> => {
  const cacheKey = `topic_db_v1_${language}_${query.trim().toLowerCase()}`;
  
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as SearchResult;
  }

  try {
    if (!navigator.onLine) throw new Error("Offline");

    const langPrompt = language === 'zh' ? `Output in Traditional Chinese (Technical Terms in English).` : `Output in English.`;

    // Use a custom separator format instead of pure JSON to handle C++ code blocks robustly
    const prompt = `
    You are a Senior Database Kernel Engineer and Professor with 20+ years of experience in MySQL 8.0, PostgreSQL, and Distributed Systems.
    Topic: "${query}"

    Task: Create a structured lecture script.
    Length: Approx ${lengthMinutes} minutes spoken.

    Format Requirements:
    1. Output strictly in two parts separated by "---TRANSCRIPT---".
    2. First part is JSON metadata (title, techStack, overview).
    3. Second part is the RAW TRANSCRIPT dialogue.
    4. Use "Teacher:" and "Student:" as speaker labels.
    5. Include C/C++ source code snippets using markdown code blocks (\`\`\`c).
    6. End the transcript with "---END---" to mark completion.

    Structure:
    ---HEADER---
    {
      "title": "Topic Title",
      "techStack": "e.g. InnoDB / Postgres Executor",
      "overview": "A short technical summary."
    }
    ---TRANSCRIPT---
    Teacher: Let's dive into the internals of...
    
    Student: How does the lock manager handle this?
    
    Teacher: Good question. Look at this struct in lock.c...
    \`\`\`c
    struct lock_sys_t { ... };
    \`\`\`
    
    Teacher: That concludes our session.
    ---END---

    ${langPrompt}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const fullText = response.text || "";
    
    if (!fullText) throw new Error("No response");
    
    // Parse the Multipart Response
    let jsonPart = "{}";
    let scriptPart = "";
    
    const transcriptIndex = fullText.indexOf("---TRANSCRIPT---");
    
    if (transcriptIndex !== -1) {
        // Extract JSON Header
        const headerText = fullText.substring(0, transcriptIndex).replace("---HEADER---", "");
        jsonPart = cleanJson(headerText);
        
        // Extract Script
        scriptPart = fullText.substring(transcriptIndex + "---TRANSCRIPT---".length);
        
        // Remove End Marker if present
        scriptPart = scriptPart.replace("---END---", "").trim();
    } else {
        // Fallback: Try to parse entire thing as JSON (old method)
        try {
            const data = JSON.parse(cleanJson(fullText));
            return {
                topic: data.topic,
                passage: { reference: data.topic.title, text: data.topic.overview, context: data.script },
                timestamp: Date.now()
            };
        } catch (e) {
             throw new Error("Failed to parse AI response format.");
        }
    }

    let data;
    try {
        data = JSON.parse(jsonPart);
    } catch (e) {
        // Metadata parse failed, reconstruct basic metadata
        data = { title: query, techStack: "Database Internals", overview: "Generated Lecture" };
    }
    
    // Fallback for empty script
    if (!scriptPart || scriptPart.trim().length < 50) {
        scriptPart = `Teacher: Let me explain ${data.title}. ${data.overview}\n\nStudent: Can you show me the code?\n\nTeacher: Let's look at the source.`;
    }

    const result: SearchResult = {
        topic: {
            title: data.title || query,
            techStack: data.techStack || "DB Internal",
            overview: data.overview || "Detailed analysis of database architecture."
        },
        passage: {
            reference: data.title || query,
            text: data.overview || "",
            context: scriptPart
        },
        timestamp: Date.now()
    };
    
    searchCache.set(cacheKey, result);
    persistCache();
    
    return result;
  } catch (error) {
    console.error("Topic search error:", error);
    throw error;
  }
};

export const generateSegmentSpeech = async (text: string, voice: VoiceName): Promise<string> => {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30000; // Increased to 30s for slower connections/API

  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("TTS Timeout")), TIMEOUT_MS)
      );

      const apiCall = ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      
      const pcmData = decodeBase64(response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "");
      if (pcmData.length === 0) throw new Error("Empty audio data");
      
      return URL.createObjectURL(pcmToWav(pcmData, 24000));
    } catch (e) { 
      console.warn(`TTS Attempt ${attempt + 1} failed:`, e);
      lastError = e;
      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error("TTS All Retries Failed:", lastError);
  throw lastError;
};

export const getCachedImage = (query: string): string | null => { return null; };
export const generateSongLyrics = async () => {};
