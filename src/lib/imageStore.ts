const DB_NAME = 'TournamentImages';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface ImageRecord {
  id: string;
  mimeType: string;
  data: Blob;
  createdAt: string;
}

let db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Convert a base64 data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

/**
 * Convert a Blob to an object URL for display
 */
function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Check if a URL is an IndexedDB reference
 */
export function isIndexedDBUrl(url: string): boolean {
  return url.startsWith('idb://');
}

/**
 * Check if a URL is a base64 data URL
 */
export function isBase64Url(url: string): boolean {
  return url.startsWith('data:image/');
}

/**
 * Save an image to IndexedDB
 * @param id - Unique identifier for the image (e.g., 'club-123')
 * @param dataUrl - Base64 data URL or existing idb:// URL
 * @returns The idb:// URL reference
 */
export async function saveImage(id: string, dataUrl: string): Promise<string> {
  // If already an idb:// URL, just return it
  if (isIndexedDBUrl(dataUrl)) {
    return dataUrl;
  }
  
  // If it's a remote URL (http/https), return as-is
  if (dataUrl.startsWith('http')) {
    return dataUrl;
  }
  
  // Must be a base64 data URL
  if (!isBase64Url(dataUrl)) {
    throw new Error('Invalid image data URL');
  }
  
  const database = await getDB();
  const blob = dataUrlToBlob(dataUrl);
  const mimeType = dataUrl.split(':')[1].split(';')[0];
  
  const record: ImageRecord = {
    id,
    mimeType,
    data: blob,
    createdAt: new Date().toISOString()
  };
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(`idb://${id}`);
  });
}

/**
 * Get an image from IndexedDB and return it as an object URL
 * @param idOrUrl - Either an idb:// URL or just the ID
 * @returns Object URL for the image, or null if not found
 */
export async function getImage(idOrUrl: string): Promise<string | null> {
  if (!idOrUrl) return null;
  
  // If it's already a remote URL or data URL, return as-is
  if (idOrUrl.startsWith('http') || isBase64Url(idOrUrl)) {
    return idOrUrl;
  }
  
  // Extract ID from idb:// URL
  const id = isIndexedDBUrl(idOrUrl) ? idOrUrl.slice(6) : idOrUrl;
  
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const record: ImageRecord | undefined = request.result;
      if (record) {
        resolve(blobToObjectUrl(record.data));
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Get the raw blob data for an image (useful for export)
 */
export async function getImageBlob(idOrUrl: string): Promise<Blob | null> {
  if (!idOrUrl) return null;
  
  // If it's a data URL, convert to blob
  if (isBase64Url(idOrUrl)) {
    return dataUrlToBlob(idOrUrl);
  }
  
  // If it's a remote URL, fetch it
  if (idOrUrl.startsWith('http')) {
    try {
      const response = await fetch(idOrUrl);
      return response.blob();
    } catch {
      return null;
    }
  }
  
  // Extract ID from idb:// URL
  const id = isIndexedDBUrl(idOrUrl) ? idOrUrl.slice(6) : idOrUrl;
  
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const record: ImageRecord | undefined = request.result;
      resolve(record?.data || null);
    };
  });
}

/**
 * Convert a blob back to base64 data URL (for export)
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Migrate a base64 data URL to IndexedDB
 * @param base64Url - The base64 data URL to migrate
 * @param id - The ID to use for storage
 * @returns The idb:// URL reference
 */
export async function migrateBase64ToIndexedDB(
  base64Url: string,
  id: string
): Promise<string> {
  if (!isBase64Url(base64Url)) {
    // If not base64, return as-is (could be idb:// or http://)
    return base64Url;
  }
  
  return saveImage(id, base64Url);
}

/**
 * Delete an image from IndexedDB
 * @param idOrUrl - The idb:// URL or ID to delete
 */
export async function deleteImage(idOrUrl: string): Promise<void> {
  if (!isIndexedDBUrl(idOrUrl)) {
    // If it's not an idb:// URL, nothing to delete
    return;
  }
  
  const id = idOrUrl.slice(6);
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Extract the ID from an idb:// URL
 */
export function extractImageId(url: string): string | null {
  if (isIndexedDBUrl(url)) {
    return url.slice(6);
  }
  return null;
}

// Export a singleton object for convenience
export const imageStore = {
  saveImage,
  getImage,
  getImageBlob,
  blobToDataUrl,
  migrateBase64ToIndexedDB,
  deleteImage,
  extractImageId,
  isIndexedDBUrl,
  isBase64Url
};

export default imageStore;
