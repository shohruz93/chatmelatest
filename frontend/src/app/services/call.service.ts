import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { SocketService } from './socket.service';
import { VoiceChatService } from './voice-chat.service';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface IncomingCall {
    callerId: number;
    callerName: string;
    callerAvatar: string;
    roomId: string;
}

export interface ActiveCall {
    partnerId: number;
    partnerName: string;
    partnerAvatar: string;
    roomId: string;
    startedAt: number;
}

@Injectable({ providedIn: 'root' })
export class CallService implements OnDestroy {
    private socket = inject(SocketService);
    private voiceService = inject(VoiceChatService);
    private auth = inject(AuthService);
    private router = inject(Router);

    incomingCall = signal<IncomingCall | null>(null);
    activeCall = signal<ActiveCall | null>(null);
    callRejectedReason = signal<string | null>(null);

    private timerInterval: any = null;
    private outgoingCallTimeout: any = null;
    callDurationSeconds = signal(0);

    private destroy$ = new Subject<void>();

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        // Someone is calling us
        this.socket.on('incoming_call').pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
            console.log('[CallService] Incoming call from', data.callerName);
            this.incomingCall.set({
                callerId: data.callerId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar,
                roomId: data.roomId
            });
            this.playRingtone();
        });

        // Callee accepted our call
        this.socket.on('call_accepted').pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
            console.log('[CallService] Call accepted by', data.calleeId);
            this.clearOutgoingCallTimeout();
            this.stopRingtone();
            // Join the LiveKit room for audio
            this.voiceService.joinRoom(data.roomId);
        });

        // Call was rejected / user is busy
        this.socket.on('call_rejected').pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
            console.log('[CallService] Call rejected:', data.reason);
            this.clearOutgoingCallTimeout();
            this.stopRingtone();
            this.endCallLocally();
            this.callRejectedReason.set(data.reason || 'declined');
            setTimeout(() => this.callRejectedReason.set(null), 4000);
        });

        // Partner ended the call
        this.socket.on('call_ended').pipe(takeUntil(this.destroy$)).subscribe(() => {
            console.log('[CallService] Call ended by partner');
            this.endCallLocally();
        });

        // When LiveKit connects → officially active call
        // Watch voice service active state
    }

    startCall(calleeId: number, calleeName: string, calleeAvatar: string, chatRoomId: string) {
        const currentUser = this.auth.currentUserValue;
        const livekitRoomId = `call_${chatRoomId}`;

        this.socket.emit('call_user', {
            calleeId,
            callerName: currentUser?.name || 'Unknown',
            callerAvatar: currentUser?.avatar || '',
            roomId: livekitRoomId
        });

        // Show outgoing call state
        this.activeCall.set({
            partnerId: calleeId,
            partnerName: calleeName,
            partnerAvatar: calleeAvatar,
            roomId: livekitRoomId,
            startedAt: 0 // will be set on accept
        });

        this.playRingtone();

        // Timeout after 60 seconds if partner doesn't pick up
        this.outgoingCallTimeout = setTimeout(() => {
            console.log('[CallService] Outgoing call timed out');
            this.endCall();
            this.callRejectedReason.set('Корбар ҷавоб надод');
            setTimeout(() => this.callRejectedReason.set(null), 4000);
        }, 60000);
    }

    /** Callee accepts the incoming call */
    acceptCall() {
        const call = this.incomingCall();
        if (!call) return;

        this.socket.emit('call_accepted', {
            callerId: call.callerId,
            roomId: call.roomId
        });

        this.activeCall.set({
            partnerId: call.callerId,
            partnerName: call.callerName,
            partnerAvatar: call.callerAvatar,
            roomId: call.roomId,
            startedAt: Date.now()
        });

        this.incomingCall.set(null);
        this.stopRingtone();
        this.startTimer();

        // Navigate to the chat page with the user
        this.router.navigate(['/dashboard/chat', call.callerId]);

        // Join LiveKit room for audio
        this.voiceService.joinRoom(call.roomId);
    }

    /** Callee rejects the incoming call */
    rejectCall() {
        const call = this.incomingCall();
        if (!call) return;

        this.socket.emit('call_rejected', {
            callerId: call.callerId,
            reason: 'declined'
        });

        this.incomingCall.set(null);
        this.stopRingtone();
    }

    /** Either party ends the active call */
    endCall() {
        const call = this.activeCall();
        if (call) {
            this.socket.emit('call_ended', { partnerId: call.partnerId });
        }
        this.endCallLocally();
    }

    /** Set active call as started (after livekit connects) */
    markCallActive(startedAt = Date.now()) {
        if (this.activeCall()) {
            this.activeCall.update(c => c ? { ...c, startedAt } : null);
            this.startTimer();
        }
    }

    private endCallLocally() {
        this.activeCall.set(null);
        this.incomingCall.set(null);
        this.clearOutgoingCallTimeout();
        this.stopTimer();
        this.voiceService.cleanup();
    }

    private clearOutgoingCallTimeout() {
        if (this.outgoingCallTimeout) {
            clearTimeout(this.outgoingCallTimeout);
            this.outgoingCallTimeout = null;
        }
    }

    private startTimer() {
        this.callDurationSeconds.set(0);
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.callDurationSeconds.update(s => s + 1);
        }, 1000);
    }

    private stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatDuration(seconds: number): string {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // ── Ringtone (optional) ───────────────────────────────────────────────────
    private audioCtx: AudioContext | null = null;
    private ringtoneInterval: any = null;

    private playRingtone() {
        try {
            this.audioCtx = new AudioContext();
            let tick = 0;
            this.ringtoneInterval = setInterval(() => {
                if (!this.audioCtx) return;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.frequency.value = tick % 2 === 0 ? 880 : 660;
                gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.3);
                tick++;
            }, 700);
        } catch (e) { /* ignore if audio not supported */ }
    }

    private stopRingtone() {
        if (this.ringtoneInterval) { clearInterval(this.ringtoneInterval); this.ringtoneInterval = null; }
        if (this.audioCtx) { this.audioCtx.close().catch(() => { }); this.audioCtx = null; }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.stopRingtone();
        this.stopTimer();
    }
}
