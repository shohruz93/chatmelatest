import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TranslationService {
    private http = inject(HttpClient);
    private apiUrl = 'https://ftapi.pythonanywhere.com/translate';

    translate(text: string, targetLang: string, sourceLang: string = 'auto'): Observable<string> {
        const url = `${this.apiUrl}?sl=${sourceLang}&dl=${targetLang}&text=${encodeURIComponent(text)}`;

        return this.http.get<any>(url).pipe(
            map(response => response['destination-text']),
            catchError(error => {
                console.error('Translation error:', error);
                return of(text); // Return original text on error
            })
        );
    }
}
