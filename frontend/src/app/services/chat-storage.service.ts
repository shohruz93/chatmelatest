import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const DB_NAME_PREFIX = 'chatme_';
const DB_VERSION = 2;
const MESSAGES_STORE = 'messages';
const CONVERSATIONS_STORE = 'conversations';

@Injectable({
  providedIn: 'root'
})
export class ChatStorageService {
  private db: IDBDatabase | null = null;
  private dbName: string = '';

  private messagesUpdated = new BehaviorSubject<void>(undefined);
  messagesUpdated$ = this.messagesUpdated.asObservable();

  public async openDb(userId: number): Promise<void> {
    if (this.db && this.dbName === `${DB_NAME_PREFIX}${userId}`) {
      return;
    }

    this.dbName = `${DB_NAME_PREFIX}${userId}`;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          store.createIndex('roomId', 'roomId', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('roomId_createdAt', ['roomId', 'created_at'], { unique: false });
          store.createIndex('status', 'status', { unique: false });
        } else {
          // Upgrade existing store if needed
          const store = (event.target as any).transaction.objectStore(MESSAGES_STORE);
          if (!store.indexNames.contains('roomId_createdAt')) {
            store.createIndex('roomId_createdAt', ['roomId', 'created_at'], { unique: false });
          }
          if (!store.indexNames.contains('status')) {
            store.createIndex('status', 'status', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const store = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'roomId' });
          store.createIndex('last_updated', 'last_updated', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized. Call openDb first.');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async addMessage(message: any): Promise<void> {
    const store = this.getStore(MESSAGES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(message);
      request.onsuccess = () => {
        this.messagesUpdated.next();
        resolve();
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async addMessages(messages: any[]): Promise<void> {
    if (messages.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('DB not open');
        return;
      }
      const transaction = this.db.transaction(MESSAGES_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      messages.forEach(msg => store.put(msg));
      transaction.oncomplete = () => {
        this.messagesUpdated.next();
        resolve();
      };
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  }

  // Add messages only if they don't already exist (for syncing without duplicates)
  async addMessagesIfNotExists(messages: any[]): Promise<void> {
    console.log('[STORAGE] addMessagesIfNotExists called with', messages?.length, 'messages');
    if (messages.length === 0) {
      console.log('[STORAGE] No messages to add, returning');
      return Promise.resolve();
    }

    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        console.error('[STORAGE] DB not open!');
        reject('DB not open');
        return;
      }

      const transaction = this.db.transaction(MESSAGES_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      let addedCount = 0;

      for (const msg of messages) {
        // Check if message already exists
        const existingRequest = store.get(msg.id);
        existingRequest.onsuccess = () => {
          if (!existingRequest.result) {
            // Message doesn't exist, add it
            console.log('[STORAGE] Adding message:', msg.id);
            store.put(msg);
            addedCount++;
          } else {
            console.log('[STORAGE] Message already exists:', msg.id);
          }
        };
      }

      transaction.oncomplete = () => {
        console.log('[STORAGE] Transaction complete, added', addedCount, 'messages');
        if (addedCount > 0) {
          this.messagesUpdated.next();
        }
        resolve();
      };
      transaction.onerror = (event) => {
        console.error('[STORAGE] Transaction error:', (event.target as IDBTransaction).error);
        reject((event.target as IDBTransaction).error);
      };
    });
  }

  async getMessages(roomId: string, limit = 50, offset = 0): Promise<any[]> {
    console.log('[STORAGE] getMessages called for roomId:', roomId, 'limit:', limit, 'offset:', offset);
    const store = this.getStore(MESSAGES_STORE, 'readonly');
    const index = store.index('roomId_createdAt');
    const messages: any[] = [];

    // We want the LATEST messages, so we use 'prev' and a range for the specific roomId
    const range = IDBKeyRange.bound([roomId, 0], [roomId, Infinity]);
    console.log('[STORAGE] Using range:', range);

    return new Promise((resolve, reject) => {
      let skipped = 0;
      const request = index.openCursor(range, 'prev');
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          console.log('[STORAGE] Found message:', cursor.value);
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }

          if (messages.length < limit) {
            messages.push(cursor.value);
            cursor.continue();
          } else {
            console.log('[STORAGE] Returning', messages.length, 'messages');
            resolve(messages.reverse()); // Reverse back to chronological order
          }
        } else {
          console.log('[STORAGE] No more messages, returning', messages.length, 'messages');
          resolve(messages.reverse());
        }
      };
      request.onerror = (event) => {
        console.error('[STORAGE] Error getting messages:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    const store = this.getStore(MESSAGES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(messageId);
      request.onsuccess = () => {
        this.messagesUpdated.next();
        resolve();
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async getPendingMessages(roomId?: string): Promise<any[]> {
    const store = this.getStore(MESSAGES_STORE, 'readonly');
    const index = store.index('status');
    const messages: any[] = [];

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only('sending'));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (!roomId || cursor.value.roomId === roomId) {
            messages.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(messages);
        }
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async clearRoom(roomId: string): Promise<void> {
    const store = this.getStore(MESSAGES_STORE, 'readwrite');
    const index = store.index('roomId');
    const range = IDBKeyRange.only(roomId);

    return new Promise((resolve, reject) => {
      const request = index.openKeyCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursor>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          this.messagesUpdated.next();
          resolve();
        }
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async updateMessage(message: any): Promise<void> {
    return this.addMessage(message); // put handles both add and update
  }

  // Replace a temporary message with the real one from server
  async replaceTempMessage(tempId: string, realMessage: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(MESSAGES_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);

      // Delete temp message
      store.delete(tempId);

      // Add real message
      store.put(realMessage);

      transaction.oncomplete = () => {
        this.messagesUpdated.next();
        resolve();
      };
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  }

  // Clean up old temporary messages (older than 1 hour)
  async cleanupOldTempMessages(): Promise<void> {
    if (!this.db) {
      return;
    }

    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(MESSAGES_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('sending'));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const msg = cursor.value;
          if (msg.created_at && msg.created_at < oneHourAgo) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async getLastSyncTimestamp(roomId: string): Promise<number> {
    const store = this.getStore(CONVERSATIONS_STORE, 'readonly');
    return new Promise((resolve) => {
      const request = store.get(roomId);
      request.onsuccess = () => {
        resolve(request.result?.lastSyncTimestamp ?? 0);
      };
      request.onerror = () => resolve(0);
    });
  }

  async setLastSyncTimestamp(roomId: string, timestamp: number): Promise<void> {
    const store = this.getStore(CONVERSATIONS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ roomId, lastSyncTimestamp: timestamp });
      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  }

  // Store partner info for chat header
  async savePartnerInfo(roomId: string, partnerInfo: any): Promise<void> {
    const store = this.getStore(CONVERSATIONS_STORE, 'readwrite');
    return new Promise(async (resolve, reject) => {
      try {
        // Get existing conversation data
        const getRequest = store.get(roomId);
        getRequest.onsuccess = () => {
          const existing = getRequest.result || { roomId };
          const updated = {
            ...existing,
            partnerInfo: partnerInfo,
            last_updated: Date.now()
          };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject();
        };
        getRequest.onerror = () => reject();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get partner info for chat header
  async getPartnerInfo(roomId: string): Promise<any> {
    const store = this.getStore(CONVERSATIONS_STORE, 'readonly');
    return new Promise((resolve) => {
      const request = store.get(roomId);
      request.onsuccess = () => {
        resolve(request.result?.partnerInfo || null);
      };
      request.onerror = () => resolve(null);
    });
  }
}
