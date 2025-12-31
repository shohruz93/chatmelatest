import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TranslationService {
    private http = inject(HttpClient);
    private primaryApiUrl = 'https://ftapi.pythonanywhere.com/translate';
    private fallbackApiUrl = 'https://translate.googleapis.com/translate_a/single';

    translate(text: string, targetLang: string, sourceLang: string = 'auto'): Observable<string> {
        if (text === 'Recording...') return of('Recording...');
        // Normalize 'tj' to 'tg' for better compatibility with translation APIs
        const dl = targetLang === 'tj' ? 'tg' : targetLang;
        const sl = sourceLang === 'tj' ? 'tg' : sourceLang;

        const primaryUrl = `${this.primaryApiUrl}?sl=${sl}&dl=${dl}&text=${encodeURIComponent(text)}`;

        return this.http.get<any>(primaryUrl).pipe(
            map(response => {
                const translated = response?.['destination-text'] || response?.['translatedText'];
                if (translated) return translated;
                throw new Error('Invalid response structure');
            }),
            catchError(() => {
                // Fallback to Google Translate Unofficial API
                const fallbackUrl = `${this.fallbackApiUrl}?client=gtx&sl=${sl}&tl=${dl}&dt=t&q=${encodeURIComponent(text)}`;

                return this.http.get<any>(fallbackUrl).pipe(
                    map(data => {
                        if (data && data[0] && data[0][0] && data[0][0][0]) {
                            return data[0][0][0];
                        }
                        return text;
                    }),
                    catchError(() => of(text))
                );
            })
        );
    }
}
