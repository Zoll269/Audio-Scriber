
export interface TranscriptionData {
  summary: string;
  actionItems: string[];
  highlights: string[];
  rawTranscript: string;
}

export interface Recording {
  id: string;
  name: string;
  date: string;
  audioUrl?: string; // Generated on-demand for playback
  audioBlob?: Blob; // Stored in IndexedDB, loaded into state when active
  transcription: TranscriptionData | null;
}

export interface ProcessingStatus {
  active: boolean;
  message: string;
  progress: number; // 0 to 100
}
