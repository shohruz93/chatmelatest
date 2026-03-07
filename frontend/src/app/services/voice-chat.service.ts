import { Injectable, signal, inject } from '@angular/core';
import { SocketService } from './socket.service';
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    Track,
} from 'livekit-client';

@Injectable({
    providedIn: 'root'
})
export class VoiceChatService {
    private socket = inject(SocketService);

    private room: Room | null = null;
    private audioContext: AudioContext | null = null;
    private localStream: MediaStream | null = null;
    private audioPollingInterval: any = null;
    private audioElements = new Map<string, HTMLAudioElement>(); // identity -> <audio>

    // Signals for UI state
    isActive = signal(false);
    isMuted = signal(false);
    connectionError = signal<string | null>(null);
    isConnecting = signal(false);
    public speakerActivity = signal<Map<number, boolean>>(new Map());

    private myUserId: number = 0;

    constructor() {
        this.setupSocketListeners();
    }

    setMyUserId(id: number) {
        this.myUserId = id;
    }

    private setupSocketListeners() {
        // Listen for LiveKit token
        this.socket.on('livekit_token').subscribe(async (data: any) => {
            console.log('[VoiceService] Received LiveKit token');
            await this.connectToLiveKit(data.url, data.token);
        });

        this.socket.on('livekit_error').subscribe((data: any) => {
            console.error('[VoiceService] LiveKit error:', data.message);
            this.connectionError.set(data.message || 'Failed to get audio token');
            this.isConnecting.set(false);
        });

        this.socket.on('voice_error').subscribe((data: any) => {
            console.error('[VoiceService] Voice error:', data);
            this.connectionError.set(data.message || 'Voice connection failed');
        });
    }

    /** Request token from server and connect to LiveKit room.
     *  Called when the user joins a voice room. */
    async joinRoom(roomId: string) {
        console.log('[VoiceService] Requesting LiveKit token for room:', roomId);
        this.isConnecting.set(true);
        this.connectionError.set(null);
        this.socket.emit('get_livekit_token', { roomId });
        // Connection continues in setupSocketListeners -> livekit_token handler
    }

    private async connectToLiveKit(url: string, token: string) {
        try {
            console.log('[VoiceService] Connecting to LiveKit:', url);

            if (this.room) {
                await this.room.disconnect();
            }

            const newRoom = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            newRoom
                .on(RoomEvent.Connected, () => {
                    console.log('[VoiceService] Connected to LiveKit room');
                    this.isActive.set(true);
                    this.isConnecting.set(false);
                })
                .on(RoomEvent.Disconnected, () => {
                    console.log('[VoiceService] Disconnected from LiveKit room');
                    this.isActive.set(false);
                })
                .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                    console.log('[VoiceService] Track subscribed from', participant.identity, track.kind);
                    if (track.kind === Track.Kind.Audio) {
                        // IMPORTANT: attach() creates an <audio> element but it MUST be added to
                        // the DOM for the browser to actually play back the audio.
                        const audioEl = track.attach() as HTMLAudioElement;
                        audioEl.autoplay = true;
                        audioEl.volume = 1.0;
                        audioEl.style.display = 'none'; // Hidden but in DOM
                        document.body.appendChild(audioEl);
                        this.audioElements.set(participant.identity, audioEl);
                        // Attempt play in case autoplay was blocked
                        audioEl.play().catch(e => console.warn('[VoiceService] Autoplay blocked:', e));
                        console.log('[VoiceService] Audio element added to DOM for', participant.identity);
                    }
                })
                .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                    console.log('[VoiceService] Track unsubscribed from', participant.identity);
                    track.detach();
                    const el = this.audioElements.get(participant.identity);
                    if (el) { el.remove(); this.audioElements.delete(participant.identity); }
                })
                .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
                    console.log('[VoiceService] Participant left:', participant.identity);
                    const uid = Number(participant.identity);
                    if (!isNaN(uid)) {
                        const next = new Map(this.speakerActivity());
                        next.delete(uid);
                        this.speakerActivity.set(next);
                    }
                })
                .on(RoomEvent.MediaDevicesError, (err: Error) => {
                    console.error('[VoiceService] Media device error:', err);
                    this.connectionError.set('Microphone error: ' + err.message);
                });

            await newRoom.connect(url, token, { autoSubscribe: true });

            // Enable microphone
            await newRoom.localParticipant.setMicrophoneEnabled(true);
            this.isMuted.set(false);
            console.log('[VoiceService] Microphone enabled');

            this.room = newRoom;

            // Start local audio-level polling every 100ms (no server latency)
            this.startAudioLevelPolling(newRoom);

        } catch (e: any) {
            console.error('[VoiceService] Error connecting to LiveKit:', e);
            this.connectionError.set('Failed to connect: ' + e.message);
            this.isConnecting.set(false);
        }
    }

    /** Poll audioLevel directly from LiveKit — 100ms, no server round-trip.
     *  key=0 → local user, key=userId → remote participants */
    private startAudioLevelPolling(lkRoom: Room) {
        if (this.audioPollingInterval) clearInterval(this.audioPollingInterval);
        this.audioPollingInterval = setInterval(() => {
            const activity = new Map<number, boolean>();

            // Local participant: key=0, threshold 0.006 (audible speech)
            const localLevel = lkRoom.localParticipant.audioLevel;
            activity.set(0, localLevel > 0.006);

            // Remote participants
            lkRoom.remoteParticipants.forEach((p) => {
                const uid = Number(p.identity);
                if (!isNaN(uid)) {
                    activity.set(uid, p.audioLevel > 0.006);
                }
            });

            this.speakerActivity.set(activity);
        }, 100);
    }

    async initLocalStream() {
        // With LiveKit, this is handled internally. No-op.
    }

    async startCall(targetUserId: number) {
        // With LiveKit SFU, no P2P calls needed. No-op.
    }

    removeParticipant(userId: number) {
        // LiveKit handles cleanup automatically. No-op.
    }

    toggleMute() {
        if (this.room) {
            const newMuted = !this.isMuted();
            this.room.localParticipant.setMicrophoneEnabled(!newMuted).then(() => {
                this.isMuted.set(newMuted);
                console.log('[VoiceService] Mic muted:', newMuted);
            });
        }
    }

    retryConnection() {
        // No-op with LiveKit — auto-reconnect is built-in
    }

    cleanup() {
        console.log('[VoiceService] Cleaning up LiveKit room');
        if (this.audioPollingInterval) {
            clearInterval(this.audioPollingInterval);
            this.audioPollingInterval = null;
        }
        // Remove all audio elements from DOM
        this.audioElements.forEach(el => el.remove());
        this.audioElements.clear();
        if (this.room) {
            this.room.disconnect();
            this.room = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(() => { });
            this.audioContext = null;
        }
        this.isActive.set(false);
        this.isMuted.set(false);
        this.isConnecting.set(false);
        this.speakerActivity.set(new Map());
        this.connectionError.set(null);
    }
}
