
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix, so we need to remove it.
        // e.g., "data:audio/webm;base64,...." -> "...."
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("FileReader result is not a string."));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
};
