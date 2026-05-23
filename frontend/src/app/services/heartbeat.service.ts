import { Injectable, OnDestroy, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * HeartbeatService — DEPRECATED
 * 
 * last_active is now updated automatically by the Node.js WebSocket server:
 * - On socket 'register' (user connects) → POST /heartbeat
 * - On socket 'disconnect' (user disconnects) → POST /heartbeat
 * 
 * No more HTTP polling needed from the frontend.
 * This service is kept as an empty shell to avoid breaking DI in app.ts.
 */
@Injectable({
    providedIn: 'root'
})
export class HeartbeatService implements OnDestroy {
    constructor() {
        // No-op: heartbeat is now handled server-side via WebSocket events
    }

    ngOnDestroy() {
        // No-op
    }
}
