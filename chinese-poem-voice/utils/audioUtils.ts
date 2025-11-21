
/**
 * Decodes a base64 string into a Uint8Array.
 */
export const decodeBase64 = (base64: string): Uint8Array => {
  // Handle potential whitespace in base64 string
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Wraps raw PCM data in a WAV file container.
 * Gemini TTS output is typically 24kHz, 1 channel (mono), 16-bit PCM.
 */
export const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, chunkSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Splits a long text into smaller chunks suitable for TTS streaming.
 * It respects sentence boundaries to avoid cutting off mid-sentence.
 * Target chunk size is around 200-300 characters to balance latency and request count.
 */
export const splitTextIntoChunks = (text: string): string[] => {
  if (!text || !text.trim()) return [];

  const safeText = text.replace(/\s+/g, ' ').trim();
  
  // Regex matches sentences ending with common punctuation (English & Chinese)
  // [^...] matches content, followed by [.!?...] matches delimiters
  const sentenceRegex = /[^.!?。？！\n]+[.!?。？！\n]+/g;
  let sentences = safeText.match(sentenceRegex);

  // Fallback: If regex found nothing (e.g. "Hello" without dot), use the whole text
  if (!sentences || sentences.length === 0) {
    sentences = [safeText];
  }
  
  const chunks: string[] = [];
  let currentChunk = '';
  const TARGET_CHUNK_LENGTH = 250;

  for (const s of sentences) {
    const sentence = s.trim();
    if (!sentence) continue;

    // If adding this sentence exceeds target, push current chunk and start new
    if ((currentChunk + sentence).length > TARGET_CHUNK_LENGTH) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // CRITICAL FIX: Filter out chunks that contain NO pronounceable characters.
  // This prevents sending chunks like "." or "---" or "*" to the TTS engine,
  // which causes "Empty audio data" errors.
  return chunks.filter(c => /[a-zA-Z0-9\u4e00-\u9fa5]/.test(c));
};
