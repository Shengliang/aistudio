
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SearchResult, VoiceName, Language, HistoryItem, TopicResult } from "../types";
import { decodeBase64, pcmToWav } from "../utils/audioUtils";

const ai = new GoogleGenAI({ 
  apiKey: typeof window !== 'undefined' && localStorage.getItem('user_api_key') 
    ? localStorage.getItem('user_api_key') || "" 
    : process.env.API_KEY 
});
const STORAGE_KEY = 'interview_voice_cache_v1';
const CLIENT_VERSION = "7.3.0-Interview";

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
  const cacheKey = `topic_interview_v1_${language}_${query.trim().toLowerCase()}`;
  return searchCache.has(cacheKey) ? searchCache.get(cacheKey) : null;
};

export const getSavedHistory = (language: Language): HistoryItem[] => {
  const history: HistoryItem[] = [];
  searchCache.forEach((value, key) => {
    if (key.startsWith(`topic_interview_v1_${language}_`)) {
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
  const cacheKey = `topic_interview_v1_${language}_${query.trim().toLowerCase()}`;
  
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as SearchResult;
  }

  try {
    if (!navigator.onLine) throw new Error("Offline");

    const langPrompt = language === 'zh' ? `Output in Traditional Chinese (Technical Terms in English).` : `Output in English.`;

    // Prompt engineered for Software Interviews
    const prompt = `
    You are a Senior Staff Engineer and Hiring Manager at a FAANG company (Google/Meta). 
    You are conducting a mock interview session.
    Topic: "${query}"

    Task: Create a Mock Interview Script.
    Length: Approx ${lengthMinutes} minutes spoken.

    Roles:
    - Interviewer: Ask tough, deep questions. Challenge assumptions. Be professional but demanding.
    - Candidate: Answer using the STAR method (for behavioral) or Structured Engineering Approach (for system/coding). State trade-offs clearly.

    Format Requirements:
    1. Output strictly in two parts separated by "---TRANSCRIPT---".
    2. First part is JSON metadata (title, techStack, overview).
    3. Second part is the RAW TRANSCRIPT dialogue.
    4. Use "Interviewer:" and "Candidate:" as speaker labels.
    5. Include Python/Java/C++/Pseudo-code snippets using markdown code blocks (\`\`\`cpp) if it's a coding question.
    6. End the transcript with "---END---".

    Structure:
    ---HEADER---
    {
      "title": "Interview: Topic Title",
      "techStack": "e.g. System Design / Algorithms",
      "overview": "Summary of the key interview concepts covered."
    }
    ---TRANSCRIPT---
    Interviewer: Let's discuss ${query}. How would you approach this at scale?
    
    Candidate: I would start by clarifying requirements. Are we optimizing for latency or throughput?
    
    Interviewer: Latency is critical.
    
    Candidate: In that case, I'd use a sliding window...
    \`\`\`cpp
    void sliding_window(std::vector<int>& nums, int k) {
        // Code here
    }
    \`\`\`
    
    Interviewer: That looks correct. Good job.
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
        // Fallback
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
        data = { title: query, techStack: "Software Interview", overview: "Mock Interview Session" };
    }
    
    // Fallback for empty script
    if (!scriptPart || scriptPart.trim().length < 50) {
        scriptPart = `Interviewer: Tell me about ${data.title}. ${data.overview}\n\nCandidate: Sure. Here is my approach...`;
    }

    const result: SearchResult = {
        topic: {
            title: data.title || query,
            techStack: data.techStack || "Interview Prep",
            overview: data.overview || "Deep dive mock interview."
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
  // Pre-check: If text has no pronounceable characters, skip API call
  if (!/[a-zA-Z0-9\u4e00-\u9fa5]/.test(text)) {
      console.warn("Skipping TTS for unpronounceable text:", text);
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
      if (pcmData.length === 0) {
          console.error(`TTS Empty Audio Data (Attempt ${attempt + 1}) for text: "${text.substring(0, 50)}..."`);
          throw new Error("Empty audio data received from API");
      }
      
      return URL.createObjectURL(pcmToWav(pcmData, 24000));
    } catch (e) { 
      console.warn(`TTS Attempt ${attempt + 1} failed:`, e);
      lastError = e;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error("TTS All Retries Failed for text:", text);
  throw lastError;
};

export const getCachedImage = (query: string): string | null => { return null; };
export const generateSongLyrics = async () => {};
