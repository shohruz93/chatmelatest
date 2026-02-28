import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.phpBaseUrl;
    public phpBaseUrl = environment.phpBaseUrl;

    private cache = new Map<string, Observable<any>>();
    private cacheTimers = new Map<string, any>();
    private readonly CACHE_DURATION = 5 * 60 * 1000;
    private readonly CACHEABLE_ENDPOINTS = ['/profile/guests', '/profile/comments', '/conversations', '/profile?'];

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    private shouldCache(endpoint: string): boolean {
        return this.CACHEABLE_ENDPOINTS.some(cacheable => endpoint.includes(cacheable));
    }

    private getCacheKey(endpoint: string, params: any): string {
        return `${endpoint}:${JSON.stringify(params)}`;
    }

    private clearCache(key: string) {
        this.cache.delete(key);
        const timer = this.cacheTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.cacheTimers.delete(key);
        }
    }

    get(endpoint: string, params: any = {}): Observable<any> {
        const cacheKey = this.getCacheKey(endpoint, params);

        if (this.shouldCache(endpoint) && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const request = this.http.get(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders(), params }).pipe(
            shareReplay(1)
        );

        if (this.shouldCache(endpoint)) {
            this.cache.set(cacheKey, request);
            const timer = setTimeout(() => this.clearCache(cacheKey), this.CACHE_DURATION);
            this.cacheTimers.set(cacheKey, timer);
        }

        return request;
    }

    post(endpoint: string, data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.cache.clear();
                this.cacheTimers.forEach(timer => clearTimeout(timer));
                this.cacheTimers.clear();
            })
        );
    }

    delete(endpoint: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.cache.clear();
                this.cacheTimers.forEach(timer => clearTimeout(timer));
                this.cacheTimers.clear();
            })
        );
    }

    // Guests
    recordView(viewerId: number, viewedId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/profile/view`, { viewerId, viewedId });
    }

    getGuests(userId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/profile/guests?userId=${userId}`);
    }

    getNewGuestsCount(userId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/profile/guests/new?userId=${userId}`);
    }

    markGuestsAsSeen(userId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/profile/guests/seen`, { userId });
    }

    // Comments & Ratings
    getComments(userId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/profile/comments?userId=${userId}`);
    }

    getAdminContact(): Observable<any> {
        return this.http.get(`${this.apiUrl}/support/admin-contact`);
    }

    addReply(ratingId: number, userId: number, content: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/profile/comment/reply`, { ratingId, userId, content });
    }

    likeComment(ratingId: number, userId: number, type: 'like' | 'dislike'): Observable<any> {
        return this.http.post(`${this.apiUrl}/profile/comment/like`, { ratingId, userId, type });
    }

    addComment(userId: number, ratedId: number, comment: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/profile/comment`, { userId, ratedId, comment });
    }

    searchByUniqueId(uniqueId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/profile/search?uniqueId=${uniqueId}`);
    }

    uploadFile(file: File, type: string): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        return this.http.post(`${this.apiUrl}/messages/upload`, formData, { headers: this.getHeaders() });
    }
}
