import { Injectable, OnDestroy, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { interval, Subscription, switchMap, of, catchError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class HeartbeatService implements OnDestroy {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private heartbeatSub?: Subscription;

    constructor() {
        // Start heartbeat when user is logged in
        this.auth.user$.subscribe(user => {
            if (user) {
                this.startHeartbeat(user.id);
            } else {
                this.stopHeartbeat();
            }
        });
    }

    private startHeartbeat(userId: number) {
        if (this.heartbeatSub) return;

        // Send heartbeat every 2 minutes
        this.heartbeatSub = interval(2 * 60 * 1000)
            .pipe(
                switchMap(() => {
                    return this.api.post('/heartbeat', { userId }).pipe(
                        catchError(err => {
                            console.error('Heartbeat failed', err);
                            return of(null);
                        })
                    );
                })
            )
            .subscribe();

        // Send immediate heartbeat on start
        this.api.post('/heartbeat', { userId }).pipe(
            catchError(() => of(null))
        ).subscribe();
    }

    private stopHeartbeat() {
        if (this.heartbeatSub) {
            this.heartbeatSub.unsubscribe();
            this.heartbeatSub = undefined;
        }
    }

    ngOnDestroy() {
        this.stopHeartbeat();
    }
}
