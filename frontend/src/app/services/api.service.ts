import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.phpBaseUrl;
    public phpBaseUrl = environment.phpBaseUrl;

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    get(endpoint: string, params: any = {}): Observable<any> {
        return this.http.get(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders(), params });
    }

    post(endpoint: string, data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() });
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
}
