
import React, { useState, useEffect } from 'react';
import { EditIcon } from './icons/EditIcon';
import { CheckIcon } from './icons/CheckIcon';

interface EditableHeaderProps {
  initialName: string;
  onSave: (newName: string) => void;
}

const EditableHeader: React.FC<EditableHeaderProps> = ({ initialName, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  
  useEffect(() => {
    // Reset local state if the recording selection changes
    if (!isEditing) {
        setName(initialName);
    }
  }, [initialName, isEditing]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    } else {
        setName(initialName); // Reset if user tries to save an empty name
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setName(initialName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="text-2xl font-bold text-slate-900 bg-slate-100 border-b-2 border-indigo-500 focus:outline-none w-full p-1 rounded-t-md"
          autoFocus
        />
        <button 
          onClick={handleSave}
          className="p-2 text-green-600 hover:bg-green-100 rounded-full flex-shrink-0"
          aria-label="Save name"
        >
          <CheckIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group w-full cursor-pointer" onClick={() => setIsEditing(true)}>
      <h2 className="text-2xl font-bold text-slate-900 break-words">{name}</h2>
      <button 
        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        aria-label="Edit name"
      >
        <EditIcon />
      </button>
    </div>
  );
};

export default EditableHeader;
