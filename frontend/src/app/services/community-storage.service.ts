import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CommunityPost } from './community.service';

const DB_NAME_PREFIX = 'chatme_community_';
const DB_VERSION = 1;
const POSTS_STORE = 'posts';

@Injectable({
    providedIn: 'root'
})
export class CommunityStorageService {
    private db: IDBDatabase | null = null;
    private dbName: string = '';

    private postsUpdated = new BehaviorSubject<void>(undefined);
    postsUpdated$ = this.postsUpdated.asObservable();

    public async openDb(userId: number): Promise<void> {
        if (this.db && this.dbName === `${DB_NAME_PREFIX}${userId}`) {
            return;
        }

        this.dbName = `${DB_NAME_PREFIX}${userId}`;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(POSTS_STORE)) {
                    const store = db.createObjectStore(POSTS_STORE, { keyPath: 'id' });
                    store.createIndex('created_at', 'created_at', { unique: false });
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

    async savePosts(posts: CommunityPost[]): Promise<void> {
        if (posts.length === 0) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(POSTS_STORE, 'readwrite');
            const store = transaction.objectStore(POSTS_STORE);

            posts.forEach(post => {
                store.put(post);
            });

            transaction.oncomplete = () => {
                this.postsUpdated.next();
                resolve();
            };

            transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
        });
    }

    async getPosts(limit: number = 20, offset: number = 0): Promise<CommunityPost[]> {
        if (!this.db) return [];

        const store = this.getStore(POSTS_STORE, 'readonly');
        const index = store.index('created_at');
        const posts: CommunityPost[] = [];

        return new Promise((resolve, reject) => {
            // Get posts in reverse chronological order (newest first)
            const request = index.openCursor(null, 'prev');
            let skipped = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    if (skipped < offset) {
                        skipped++;
                        cursor.continue();
                        return;
                    }

                    if (posts.length < limit) {
                        posts.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(posts);
                    }
                } else {
                    resolve(posts);
                }
            };

            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async deletePost(postId: number): Promise<void> {
        const store = this.getStore(POSTS_STORE, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(postId);
            request.onsuccess = () => {
                this.postsUpdated.next();
                resolve();
            };
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async updatePost(post: CommunityPost): Promise<void> {
        const store = this.getStore(POSTS_STORE, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(post);
            request.onsuccess = () => {
                this.postsUpdated.next();
                resolve();
            };
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }
}
