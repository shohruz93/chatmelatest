import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';

export interface Mission {
    id: number;
    title: string;
    description: string;
    reward_coins: number;
    xp_reward: number;
    type: string;
    condition_key: string;
    condition_value: number;
    icon: string;
    user_mission_id?: number;
    status?: 'active' | 'completed' | 'claimed';
    progress?: number;
}

@Injectable({
    providedIn: 'root'
})
export class GamificationService {
    private apiUrl = environment.phpBaseUrl;

    // Signals for reactive UI
    userCoins = signal<number>(0);
    userXp = signal<number>(0);

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    getMissions(): Observable<Mission[]> {
        return this.http.get<Mission[]>(`${this.apiUrl}/gamification/missions`, { headers: this.getHeaders() });
    }

    claimMission(userMissionId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/gamification/claim`, { user_mission_id: userMissionId }, { headers: this.getHeaders() }).pipe(
            tap((res: any) => {
                if (res.coins_added) {
                    this.userCoins.update(c => c + res.coins_added);
                }
                if (res.xp_added) {
                    this.userXp.update(x => x + res.xp_added);
                }
            })
        );
    }

    trackMission(conditionKey: string, amount: number = 1): void {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;

        try {
            const user = JSON.parse(userStr);
            this.http.post(`${this.apiUrl}/gamification/track`, {
                userId: user.id,
                conditionKey: conditionKey,
                amount: amount
            }, { headers: this.getHeaders() }).subscribe({
                error: (err) => console.error('Failed to track mission:', err)
            });
        } catch (e) {
            console.error('Failed to parse user for mission tracking:', e);
        }
    }

    setWalletState(coins: number, xp: number) {
        this.userCoins.set(coins || 0);
        this.userXp.set(xp || 0);
    }

    bet(amount: number, game: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/games/bet`, { amount, game }, { headers: this.getHeaders() }).pipe(
            tap((res: any) => {
                if (res.current_coins !== undefined) {
                    this.userCoins.set(res.current_coins);
                }
            })
        );
    }

    win(amount: number, game: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/games/win`, { amount, game }, { headers: this.getHeaders() }).pipe(
            tap((res: any) => {
                if (res.current_coins !== undefined) {
                    this.userCoins.set(res.current_coins);
                }
                // XP update handled by tap or reload
                this.userXp.update(x => x + 10);
            })
        );
    }

    // Coins API Methods
    getTransactions(type: 'all' | 'incoming' | 'outgoing' = 'all', limit: number = 20, offset: number = 0): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/coins/transactions?type=${type}&limit=${limit}&offset=${offset}`, { headers: this.getHeaders() });
    }

    sendCoins(receiverId: number, amount: number, note?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/coins/send`, {
            receiverId,
            amount,
            note: note || null
        }, { headers: this.getHeaders() }).pipe(
            tap((res: any) => {
                if (res.current_coins !== undefined) {
                    this.userCoins.set(res.current_coins);
                }
            })
        );
    }

    getBalance(): Observable<{ coins: number; xp: number }> {
        return this.http.get<{ coins: number; xp: number }>(`${this.apiUrl}/coins/balance`, { headers: this.getHeaders() });
    }

    claimReward(): Observable<any> {
        return this.http.post(`${this.apiUrl}/coins/claim-reward`, {}, { headers: this.getHeaders() }).pipe(
            tap((res: any) => {
                if (res.success) {
                    this.userCoins.update(c => c + (res.amount || 3));
                }
            })
        );
    }
}

