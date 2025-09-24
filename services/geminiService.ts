
import { GoogleGenAI, Type } from "@google/genai";
import type { TranscriptionData } from "../types";
import { blobToBase64 } from "../utils";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise, professional summary of the entire transcription, capturing the key points and overall sentiment.",
        },
        actionItems: {
            type: Type.ARRAY,
            description: "A list of specific, actionable tasks mentioned in the transcript. Each item should be a clear to-do.",
            items: { type: Type.STRING },
        },
        highlights: {
            type: Type.ARRAY,
            description: "A list of the most important quotes, decisions, or key takeaways from the conversation.",
            items: { type: Type.STRING },
        },
    },
    required: ["summary", "actionItems", "highlights"],
};

export type ProgressCallback = (status: { message: string; progress: number }) => void;

// Helper to get audio duration from a blob
const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        const url = URL.createObjectURL(audioBlob);
        audio.src = url;
        audio.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(url);
            resolve(audio.duration);
        }, { once: true });
        audio.addEventListener('error', () => {
            URL.revokeObjectURL(url);
            resolve(0); // Resolve with 0 if there's an error loading metadata
        }, { once: true });
    });
};

export async function processAudio(audioBlob: Blob, onProgress: ProgressCallback): Promise<TranscriptionData> {
  onProgress({ message: 'Analyzing audio file...', progress: 5 });

  const duration = await getAudioDuration(audioBlob);
  const audioMimeType = audioBlob.type || 'audio/webm';
  const MAX_CHUNK_MINUTES = 9;
  const MAX_CHUNK_SECONDS = MAX_CHUNK_MINUTES * 60;

  let rawTranscript = '';

  if (duration <= MAX_CHUNK_SECONDS) {
      // Process as a single chunk if it's short enough
      onProgress({ message: 'Transcribing audio...', progress: 20 });
      const base64Audio = await blobToBase64(audioBlob);
      const transcriptResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
              parts: [
                  { inlineData: { mimeType: audioMimeType, data: base64Audio } },
                  { text: "Provide a clean, accurate, and detailed transcription of this audio. Do not add any commentary, just the text." },
              ],
          },
      });
      rawTranscript = transcriptResponse.text;
  } else {
      // Handle long audio by chunking
      const numChunks = Math.ceil(duration / MAX_CHUNK_SECONDS);
      // Slice blob by size, which is a good approximation for constant bitrate audio like webm
      const chunkSize = Math.ceil(audioBlob.size / numChunks);
      
      const transcriptionParts: string[] = [];
      for (let i = 0; i < numChunks; i++) {
          const progress = 20 + Math.round((i / numChunks) * 60); // Progress from 20% to 80%
          onProgress({ message: `Transcribing chunk ${i + 1} of ${numChunks}...`, progress });
          
          const start = i * chunkSize;
          const end = start + chunkSize;
          const chunk = audioBlob.slice(start, end, audioMimeType);
          const base64Audio = await blobToBase64(chunk);
          
          try {
            const transcriptResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { mimeType: audioMimeType, data: base64Audio } },
                        { text: "Provide a clean, accurate, and detailed transcription of this audio chunk. Do not add any commentary, just the text." },
                    ],
                },
            });
            transcriptionParts.push(transcriptResponse.text);
          } catch(e) {
            console.error(`Error processing chunk ${i+1}`, e);
            // Add an error message in the transcript itself to indicate a partial failure
            transcriptionParts.push(`\n[-- Error transcribing chunk ${i+1}. The audio segment might have been too long or corrupted. --]\n`);
          }
      }
      rawTranscript = transcriptionParts.join(' ');
  }

  if (!rawTranscript.trim()) {
      throw new Error("Failed to transcribe audio. The response was empty.");
  }

  // Step 2: Analyze the full transcript
  onProgress({ message: 'Analyzing full transcript...', progress: 85 });
  const analysisPrompt = `
    Based on the following transcription, please generate a structured analysis.
    
    Transcription:
    ---
    ${rawTranscript}
    ---
    
    Please provide the analysis in the requested JSON format.
  `;

  const analysisResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: analysisPrompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
      },
  });

  const analysisJson = JSON.parse(analysisResponse.text);
  
  onProgress({ message: 'Finalizing...', progress: 100 });
  return { ...analysisJson, rawTranscript };
}
