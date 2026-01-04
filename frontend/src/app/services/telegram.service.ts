import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface TelegramStatus {
    connected: boolean;
    telegramUsername?: string;
    notificationsEnabled?: boolean;
    connectedAt?: string;
}

export interface ConnectionCodeResponse {
    success: boolean;
    code: string;
    botUsername: string;
    deepLink: string;
}

@Injectable({
    providedIn: 'root'
})
export class TelegramService {
    private api = inject(ApiService);

    constructor() { }

    generateCode(userId: number): Observable<ConnectionCodeResponse> {
        return this.api.post('/telegram/generate-code', { userId });
    }

    verifyConnection(userId: number, code: string): Observable<any> {
        return this.api.post('/telegram/verify-connect', { userId, code });
    }

    getStatus(userId: number): Observable<TelegramStatus> {
        return this.api.get('/telegram/status', { userId });
    }

    disconnect(userId: number): Observable<any> {
        return this.api.post('/telegram/disconnect', { userId });
    }

    toggleNotifications(userId: number, enabled: boolean): Observable<any> {
        return this.api.post('/telegram/toggle-notifications', { userId, enabled });
    }
}
