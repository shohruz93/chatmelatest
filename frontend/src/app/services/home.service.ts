import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PublicStats {
  success: boolean;
  totalUsers: number;
  onlineUsers: number;
  totalCountries: number;
  totalMessages: number;
  totalLanguages: number;
  fallback?: boolean;
  stale?: boolean;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.nodeBaseUrl;

  private statsCache$: Observable<PublicStats> | null = null;

  getPublicStats(): Observable<PublicStats> {
    if (this.statsCache$) return this.statsCache$;

    this.statsCache$ = this.http
      .get<PublicStats>(`${this.apiUrl}/api/stats`)
      .pipe(
        shareReplay(1),
        catchError(() =>
          of({
            success: false,
            totalUsers: 50000,
            onlineUsers: 0,
            totalCountries: 100,
            totalMessages: 1000000,
            totalLanguages: 30,
            fallback: true,
          })
        )
      );

    return this.statsCache$;
  }
}
