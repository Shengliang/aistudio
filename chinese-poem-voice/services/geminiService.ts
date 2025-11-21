
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SearchResult, VoiceName, Language, HistoryItem, TopicResult } from "../types";
import { decodeBase64, pcmToWav } from "../utils/audioUtils";

const ai = new GoogleGenAI({ 
  apiKey: typeof window !== 'undefined' && localStorage.getItem('user_api_key') 
    ? localStorage.getItem('user_api_key') || "" 
    : process.env.API_KEY 
});
const STORAGE_KEY = 'poem_voice_cache_v1';
const CLIENT_VERSION = "8.0.0-Poem";

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
  let cleaned = text.replace(/```json\s*|\s*```/g, '');
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned;
};

// --- API Functions ---

export const checkCacheExistence = (query: string, language: Language): SearchResult | null => {
  const cacheKey = `poem_v1_${language}_${query.trim().toLowerCase()}`;
  return searchCache.has(cacheKey) ? searchCache.get(cacheKey) : null;
};

export const getSavedHistory = (language: Language): HistoryItem[] => {
  const history: HistoryItem[] = [];
  searchCache.forEach((value, key) => {
    if (key.startsWith(`poem_v1_${language}_`)) {
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
  const cacheKey = `poem_v1_${language}_${query.trim().toLowerCase()}`;
  
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as SearchResult;
  }

  try {
    if (!navigator.onLine) throw new Error("Offline");

    const langPrompt = language === 'zh' ? `Output primarily in Traditional Chinese.` : `Output primarily in English but keep poem in Chinese.`;

    // Prompt engineered for Chinese Poem Appreciation
    const prompt = `
    You are a wise Chinese Literature Master (國學大師) teaching a student about Chinese Poetry.
    Topic: "${query}"

    Task: Create a Poem Appreciation Lesson Script.
    Length: Approx ${lengthMinutes} minutes spoken.

    Roles:
    - Master: Knowledgeable, calm, poetic. Explains history, emotions, and imagery.
    - Student: Curious, eager to learn. Asks about meaning of words or historical context.

    Format Requirements:
    1. Output strictly in two parts separated by "---TRANSCRIPT---".
    2. First part is JSON metadata (title, techStack -> Dynasty/Poet, overview).
    3. Second part is the RAW TRANSCRIPT dialogue.
    4. Use "Master:" and "Student:" as speaker labels.
    5. **IMPORTANT**: Place the ORIGINAL POEM text inside a markdown code block (\`\`\`text) at the beginning or relevant part of the dialogue.
    6. End the transcript with "---END---".

    Structure:
    ---HEADER---
    {
      "title": "Poem Title (Author)",
      "techStack": "Tang Dynasty / Li Bai",
      "overview": "Brief poetic summary of the mood and meaning."
    }
    ---TRANSCRIPT---
    Master: Today, let us appreciate the masterpiece "${query}".
    \`\`\`text
    床前明月光
    疑是地上霜
    舉頭望明月
    低頭思故鄉
    \`\`\`
    
    Student: Master, what does "Yi" (疑) mean in the second line?
    
    Master: "Yi" means to suspect or wonder. The moonlight is so bright it looks like frost.
    ---END---

    ${langPrompt}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const fullText = response.text || "";
    
    if (!fullText) throw new Error("No response");
    
    let jsonPart = "{}";
    let scriptPart = "";
    
    const transcriptIndex = fullText.indexOf("---TRANSCRIPT---");
    
    if (transcriptIndex !== -1) {
        const headerText = fullText.substring(0, transcriptIndex).replace("---HEADER---", "");
        jsonPart = cleanJson(headerText);
        scriptPart = fullText.substring(transcriptIndex + "---TRANSCRIPT---".length);
        scriptPart = scriptPart.replace("---END---", "").trim();
    } else {
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
        data = { title: query, techStack: "Chinese Poetry", overview: "Poetry Appreciation" };
    }
    
    if (!scriptPart || scriptPart.trim().length < 50) {
        scriptPart = `Master: Let us discuss ${data.title}. ${data.overview}\n\nStudent: Please teach me.`;
    }

    const result: SearchResult = {
        topic: {
            title: data.title || query,
            techStack: data.techStack || "Poetry",
            overview: data.overview || "Poem Analysis"
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
    console.error("Search error:", error);
    throw error;
  }
};

export const generateSegmentSpeech = async (text: string, voice: VoiceName): Promise<string> => {
  if (!/[a-zA-Z0-9\u4e00-\u9fa5]/.test(text)) {
      throw new Error("Text contains no pronounceable characters");
  }

  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30000; 

  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
};

export const getCachedImage = (query: string): string | null => { return null; };
export const generateSongLyrics = async () => {};
