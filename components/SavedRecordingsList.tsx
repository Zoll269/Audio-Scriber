
import React from 'react';
import type { Recording } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlayIcon } from './icons/PlayIcon';

interface SavedRecordingsListProps {
  recordings: Recording[];
  activeRecordingId?: string;
  onSelect: (recording: Recording) => void;
  onDelete: (id: string) => void;
}

const SavedRecordingsList: React.FC<SavedRecordingsListProps> = ({ recordings, activeRecordingId, onSelect, onDelete }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">Saved Recordings</h3>
      {recordings.length === 0 ? (
        <p className="text-slate-500 text-sm">No recordings saved yet.</p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {recordings.map((rec) => {
            const isActive = activeRecordingId === rec.id;
            return (
              <li
                key={rec.id}
                className={`group flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive ? 'bg-blue-100' : 'hover:bg-slate-100'
                }`}
                onClick={() => onSelect(rec)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className={`flex-shrink-0 p-2 rounded-full transition-colors duration-200 ${isActive ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-blue-200'}`}>
                      <PlayIcon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-blue-600'}`} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm text-slate-800 truncate">{rec.name}</p>
                    <p className="text-xs text-slate-500">{new Date(rec.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(rec.id);
                  }}
                  className="p-2 rounded-full opacity-0 group-hover:opacity-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-opacity"
                  aria-label="Delete recording"
                >
                  <TrashIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SavedRecordingsList;