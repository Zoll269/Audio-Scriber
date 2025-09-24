import type { Recording } from './types';

const DB_NAME = 'AudioScribeDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Error opening DB'));
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Add or update a recording (with blob)
export const saveRecordingToDB = async (recording: Recording): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(recording);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(new Error(`Error saving recording: ${(event.target as IDBRequest).error?.message}`));
  });
};

// Get all recordings (metadata only, without blob)
export const getRecordingsFromDB = async (): Promise<Omit<Recording, 'audioBlob'>[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
        // Exclude audioBlob to keep the list lightweight
        const recordingsWithoutBlobs = request.result.map(rec => {
            const { audioBlob, ...rest } = rec;
            return rest;
        });
        // Sort by most recent first
        resolve(recordingsWithoutBlobs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };
    request.onerror = (event) => reject(new Error(`Error fetching recordings: ${(event.target as IDBRequest).error?.message}`));
  });
};


// Get a single full recording by ID (with blob)
export const getRecordingByIdFromDB = async (id: string): Promise<Recording | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(new Error(`Error fetching recording by ID: ${(event.target as IDBRequest).error?.message}`));
    });
};


// Delete a recording by ID
export const deleteRecordingFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(new Error(`Error deleting recording: ${(event.target as IDBRequest).error?.message}`));
  });
};
