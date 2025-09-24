
import React, { useState, useCallback, useEffect } from 'react';
import type { Recording, ProcessingStatus } from './types';
import { processAudio } from './services/geminiService';
import AudioRecorder from './components/AudioRecorder';
import SavedRecordingsList from './components/SavedRecordingsList';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import { SaveIcon } from './components/icons/SaveIcon';
import Spinner from './components/Spinner';
import EditableHeader from './components/EditableHeader';
import { LogoIcon } from './components/icons/LogoIcon';
import { DocumentIcon } from './components/icons/DocumentIcon';
import { 
  saveRecordingToDB, 
  getRecordingsFromDB, 
  getRecordingByIdFromDB, 
  deleteRecordingFromDB 
} from './db';

const App: React.FC = () => {
  const [recordings, setRecordings] = useState<Omit<Recording, 'audioBlob'>[]>([]);
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [newAudioDetails, setNewAudioDetails] = useState<{ url: string; blob: Blob } | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({ active: false, message: '', progress: 0 });
  const [error, setError] = useState<string | null>(null);

  // Load initial recordings from DB on component mount
  useEffect(() => {
    const loadRecordings = async () => {
        try {
            const savedRecordings = await getRecordingsFromDB();
            setRecordings(savedRecordings);
        } catch (err) {
            console.error("Failed to load recordings from DB", err);
            setError("Could not load saved recordings.");
        }
    };
    loadRecordings();
  }, []);

  const handleRecordingComplete = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setNewAudioDetails({ url, blob });
    setActiveRecording(null); // Clear previous active recording
  };

  const handleTranscribe = useCallback(async () => {
    if (!newAudioDetails) return;

    setProcessingStatus({ active: true, message: 'Starting...', progress: 0 });
    setError(null);
    setActiveRecording(null);

    const onProgress = (status: { message: string; progress: number }) => {
        setProcessingStatus({ active: true, ...status });
    };

    try {
      const transcriptionData = await processAudio(newAudioDetails.blob, onProgress);
      const newRecording: Recording = {
        id: `temp-${Date.now()}`,
        name: `Recording - ${new Date().toLocaleString()}`,
        date: new Date().toISOString(),
        audioUrl: newAudioDetails.url,
        audioBlob: newAudioDetails.blob,
        transcription: transcriptionData,
      };
      setActiveRecording(newRecording);
      setNewAudioDetails(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during transcription.');
    } finally {
      setProcessingStatus({ active: false, message: '', progress: 0 });
    }
  }, [newAudioDetails]);
  
  const handleSave = async () => {
    if (!activeRecording || !activeRecording.id.startsWith('temp-') || !activeRecording.audioBlob) return;
    
    const permanentRecording: Recording = {
      ...activeRecording,
      id: `${Date.now()}`,
    };
    
    try {
        await saveRecordingToDB(permanentRecording);
        const { audioBlob, ...metadata } = permanentRecording;
        setRecordings(prev => [metadata, ...prev]);
        setActiveRecording(permanentRecording);
    } catch(err) {
        console.error("Failed to save recording", err);
        setError("Could not save the recording.");
    }
  };

  const handleRenameRecording = async (id: string, newName: string) => {
    if (!newName) return;

    if (activeRecording && id === activeRecording.id && id.startsWith('temp-')) {
       setActiveRecording({ ...activeRecording, name: newName });
       return;
    }

    try {
      const recordingToUpdate = await getRecordingByIdFromDB(id);
      if (!recordingToUpdate) throw new Error("Recording not found in DB");

      const updatedRecording = { ...recordingToUpdate, name: newName };
      await saveRecordingToDB(updatedRecording);

      setRecordings(prev =>
        prev.map(r => (r.id === id ? { ...r, name: newName } : r))
      );
      
      if (activeRecording?.id === id) {
        setActiveRecording(prev => prev ? { ...prev, name: newName } : null);
      }
    } catch (err) {
      console.error("Failed to rename recording", err);
      setError("Could not rename the recording.");
    }
  };

  const handleSelectRecording = async (recordingMetadata: Omit<Recording, 'audioBlob'>) => {
    try {
        const fullRecording = await getRecordingByIdFromDB(recordingMetadata.id);
        if (fullRecording && fullRecording.audioBlob) {
            const audioUrl = URL.createObjectURL(fullRecording.audioBlob);
            
            // Clean up old blob URL if it exists
            if(activeRecording?.audioUrl) {
                URL.revokeObjectURL(activeRecording.audioUrl);
            }

            setActiveRecording({ ...fullRecording, audioUrl });
            setNewAudioDetails(null);
        } else {
             throw new Error('Recording data or audio blob not found.');
        }
    } catch (err) {
        console.error("Error fetching full recording:", err);
        setError("Could not load the selected recording's audio.");
    }
  };
  
  const handleDeleteRecording = async (id: string) => {
    if (confirm('Are you sure you want to delete this recording?')) {
      try {
        await deleteRecordingFromDB(id);
        setRecordings(prev => prev.filter(r => r.id !== id));
        if (activeRecording?.id === id) {
          setActiveRecording(null);
        }
      } catch (err) {
        console.error("Failed to delete recording", err);
        setError("Could not delete the recording.");
      }
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 bg-slate-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
             <div className="flex items-center gap-3">
              <LogoIcon className="h-8 w-8 text-white"/>
              <h1 className="text-2xl font-semibold text-white tracking-wide">AudioScribe AI</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col md:flex-row container mx-auto p-4 sm:p-6 lg:p-8 gap-8 print:block print:p-0 print:m-0 print:max-w-full">
        <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 print:hidden">
          <div className="space-y-6">
            <AudioRecorder onRecordingComplete={handleRecordingComplete} isProcessing={processingStatus.active} />
            <SavedRecordingsList
              recordings={recordings}
              activeRecordingId={activeRecording?.id}
              onSelect={handleSelectRecording}
              onDelete={handleDeleteRecording}
            />
          </div>
        </aside>

        <section id="transcription-content" className="w-full md:w-2/3 lg:w-3/4 bg-white rounded-2xl shadow-md p-6 md:p-8 print:w-full print:p-0 print:m-0 print:shadow-none print:rounded-none">
          {processingStatus.active && (
            <div className="flex flex-col items-center justify-center h-full">
              <Spinner />
              <p className="mt-4 text-lg text-slate-600">{processingStatus.message}</p>
              <div className="w-full max-w-md bg-slate-200 rounded-full h-2.5 mt-4">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${processingStatus.progress}%` }}></div>
              </div>
            </div>
          )}
          {error && <div className="text-red-600 bg-red-100 p-4 rounded-md">{error}</div>}
          
          {!processingStatus.active && !error && !activeRecording && newAudioDetails && (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <h2 className="text-xl font-semibold mb-2 text-slate-700">New Recording Ready</h2>
                <p className="mb-4 text-slate-500">Your audio is ready for processing.</p>
                <audio controls src={newAudioDetails.url} className="mb-6 w-full max-w-md"></audio>
                <button
                    onClick={handleTranscribe}
                    className="px-8 py-3 bg-slate-800 text-white font-bold rounded-full shadow-lg hover:bg-slate-900 transition-transform transform hover:scale-105"
                >
                    Transcribe & Analyze
                </button>
            </div>
          )}

          {!processingStatus.active && !error && !activeRecording && !newAudioDetails && (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
              <DocumentIcon className="w-24 h-24 mb-4 text-slate-300"/>
              <h2 className="text-2xl font-semibold text-slate-700">Select a Recording</h2>
              <p className="mt-2 max-w-md">Record a new audio memo using the panel on the left, or select a previously saved recording to view its transcription and analysis.</p>
            </div>
          )}

          {activeRecording && (
            <div>
              <div className="flex flex-wrap justify-between items-start mb-4 gap-4 border-b border-slate-200 pb-4">
                <div className="w-full sm:w-5/6">
                   <EditableHeader 
                    initialName={activeRecording.name}
                    onSave={(newName) => handleRenameRecording(activeRecording.id, newName)}
                  />
                </div>
                {activeRecording.id.startsWith('temp-') && (
                  <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors print:hidden">
                    <SaveIcon />
                    Save
                  </button>
                )}
              </div>
              <TranscriptionDisplay recording={activeRecording} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;