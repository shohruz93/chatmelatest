import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LearningStats {
    total_corrections: number;
    total_scenarios: number;
    total_saved_words: number;
    xp: number;
    level: number;
    streak: number;
}

export interface Flashcard {
    id: string;
    front: string;
    back: string;
    interval: number;
    repetition: number;
    efactor: number;
    nextReview: number;
}

@Injectable({
    providedIn: 'root'
})
export class LearningService {
    private http = inject(HttpClient);
    private apiUrl = environment.phpBaseUrl;

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    getStats(): Observable<LearningStats> {
        return this.http.get<LearningStats>(`${this.apiUrl}/learning/stats`, { headers: this.getHeaders() });
    }

    getFlashcards(): Observable<Flashcard[]> {
        return this.http.get<Flashcard[]>(`${this.apiUrl}/flashcards`, { headers: this.getHeaders() });
    }

    saveFlashcard(flashcard: Flashcard): Observable<any> {
        return this.http.post(`${this.apiUrl}/flashcards`, flashcard, { headers: this.getHeaders() });
    }

    deleteFlashcard(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/flashcards?id=${id}`, { headers: this.getHeaders() });
    }
}
