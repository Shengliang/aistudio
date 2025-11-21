
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SearchResult, VoiceName, Language, HistoryItem } from "../types";
import { decodeBase64, pcmToWav } from "../utils/audioUtils";

const ai = new GoogleGenAI({ 
  apiKey: typeof window !== 'undefined' && localStorage.getItem('user_api_key') 
    ? localStorage.getItem('user_api_key') || "" 
    : process.env.API_KEY 
});
const STORAGE_KEY = 'linux_voice_cache_v1';
const CLIENT_VERSION = "4.0.0";

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
    if (searchCache.size > 100) {
      const keys = Array.from(searchCache.keys());
      for (let i = 0; i < 20; i++) searchCache.delete(keys[i]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(searchCache.entries())));
  } catch (e) { searchCache.clear(); }
};

// --- API Functions ---

export const checkCacheExistence = (query: string, language: Language): SearchResult | null => {
  const cacheKey = `linux_v1_${language}_${query.trim().toLowerCase()}`;
  return searchCache.has(cacheKey) ? searchCache.get(cacheKey) : null;
};

export const getSavedHistory = (language: Language): HistoryItem[] => {
  const history: HistoryItem[] = [];
  searchCache.forEach((value, key) => {
    if (key.startsWith(`linux_v1_${language}_`)) {
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

export const getCachedImage = (topic: string): string | null => {
  const cacheKey = `img_lx_v1_${topic.substring(0, 20)}`;
  return searchCache.has(cacheKey) ? searchCache.get(cacheKey) : null;
};

export const searchTopicOverview = async (
  query: string,
  language: Language = 'en',
  forceRefresh: boolean = false
): Promise<SearchResult> => {
  const cacheKey = `linux_v1_${language}_${query.trim().toLowerCase()}`;
  
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as SearchResult;
  }

  try {
    if (!navigator.onLine) throw new Error("Offline");

    const langPrompt = language === 'zh' ? `Output in Traditional Chinese.` : `Output in English.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a Senior Linux Kernel Maintainer and OS Architect with 20+ years of experience.
      Analyze the topic: "${query}".
      
      Provide a concise technical summary (Abstract) focusing on internal mechanics.
      Identify the core Kernel Subsystem (e.g., "Process Scheduler / kernel/sched", "Memory Management / mm/slub.c", "Networking / net/core").
      ${langPrompt}
      
      Return JSON. Fields: 'title', 'overview', 'techStack'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                overview: { type: Type.STRING },
                techStack: { type: Type.STRING },
              },
              required: ["title", "overview", "techStack"],
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    const result = JSON.parse(text) as SearchResult;
    result.timestamp = Date.now();
    
    searchCache.set(cacheKey, result);
    persistCache();
    return result;
  } catch (error) {
    console.error("Topic search error:", error);
    throw error;
  }
};

export const generateLectureScript = async (
  topicTitle: string,
  overview: string,
  language: Language,
  lengthMinutes: number,
  forceRefresh: boolean = false
): Promise<string> => {
  const cacheKey = `lec_lx_v1_${language}_${lengthMinutes}_${topicTitle.replace(/\s+/g, '_')}`;
  
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) as string;
  }
  
  try {
    const targetWordCount = Math.max(200, lengthMinutes * 150);
    const langPrompt = language === 'zh' ? `Write in Traditional Chinese.` : `Write in English.`;

    const prompt = `
    Act as a Senior Linux Kernel Maintainer (Teacher) mentoring a Junior Kernel Developer (Student).
    Topic: ${topicTitle}
    Context: ${overview}
    Length: ~${targetWordCount} words.
    Goal: Prepare the student to land a Kernel Engineer job by going extremely deep into internals.
    
    Structure:
    1. Teacher: Explains the mechanism deeply (e.g., locking strategies, pointer arithmetic, cache locality).
    2. Student: Asks a question about a race condition, edge case, or specific C struct member.
    3. Teacher: Answers by referencing specific C SOURCE CODE from the Linux Kernel tree.
    
    CRITICAL INSTRUCTION FOR CODE:
    - You MUST include actual C code snippets from the Linux Source Tree.
    - Wrap code in markdown blocks like: \`\`\`c ... \`\`\`
    - Use real struct names (e.g., 'struct task_struct', 'struct page', 'struct sk_buff').
    - Mention specific files if possible (e.g., 'include/linux/sched.h').
    
    Format rules:
    - Start every spoken paragraph strictly with "Teacher:" or "Student:".
    - Code blocks should appear AFTER the Teacher introduces them.
    ${langPrompt}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    if (text) {
      searchCache.set(cacheKey, text);
      persistCache();
    }
    return text;
  } catch (error) {
    return "Failed to generate lecture.";
  }
};

export const generateBibleImage = async (topic: string): Promise<string> => {
  const cacheKey = `img_lx_v1_${topic.substring(0, 20)}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  try {
    // Using text prompt for diagram generation
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Detailed computer science system architecture diagram for ${topic}. Dark mode, neon green lines, Linux kernel internals, memory maps, pointers, schematic style, high resolution.`,
      config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
    });
    const url = `data:image/jpeg;base64,${response.generatedImages?.[0]?.image?.imageBytes}`;
    searchCache.set(cacheKey, url);
    persistCache();
    return url;
  } catch (e) { return ""; }
};

export const generateSegmentSpeech = async (text: string, voice: VoiceName): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
      // Adding client version header equivalent logic if we were using fetch, 
      // but here we stick to SDK. 
    });
    const pcmData = decodeBase64(response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "");
    return URL.createObjectURL(pcmToWav(pcmData, 24000));
  } catch (e) { throw e; }
};
