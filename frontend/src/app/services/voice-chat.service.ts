import { Injectable, signal, inject } from '@angular/core';
import { SocketService } from './socket.service';
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    Track,
    LocalAudioTrack,
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

    // Audio mixing properties
    private micStream: MediaStream | null = null;
    private micSourceNode: MediaStreamAudioSourceNode | null = null;
    private musicAudio: HTMLAudioElement | null = null;
    private musicSourceNode: MediaElementAudioSourceNode | null = null;
    private musicGainNode: GainNode | null = null;
    private mixedDestination: MediaStreamAudioDestinationNode | null = null;
    private localAudioTrack: LocalAudioTrack | null = null;

    // Signals for UI state
    isActive = signal(false);
    isMuted = signal(false);
    connectionError = signal<string | null>(null);
    isConnecting = signal(false);
    public speakerActivity = signal<Map<number, boolean>>(new Map());

    // Music control signals
    musicPlaying = signal(false);
    musicVolume = signal(0.2);
    musicFileName = signal<string | null>(null);

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

    async initAudioMixer() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            this.musicAudio = new Audio();
            this.musicAudio.loop = true;

            this.musicSourceNode = this.audioContext.createMediaElementSource(this.musicAudio);
            this.musicGainNode = this.audioContext.createGain();
            this.musicGainNode.gain.value = this.musicVolume();

            this.mixedDestination = this.audioContext.createMediaStreamDestination();

            // Connect nodes
            this.musicSourceNode.connect(this.musicGainNode);
            this.musicGainNode.connect(this.mixedDestination);

            // Connect music to output so the speaker can hear the background music
            this.musicGainNode.connect(this.audioContext.destination);
        } catch (e) {
            console.error('[VoiceService] Failed to initialize AudioContext:', e);
        }
    }

    async setMusicFile(file: File) {
        await this.initAudioMixer();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        if (this.musicAudio) {
            this.musicFileName.set(file.name);
            this.musicAudio.src = URL.createObjectURL(file);
            this.musicAudio.play()
                .then(() => this.musicPlaying.set(true))
                .catch(e => console.warn('[VoiceService] Music autoplay blocked or failed:', e));
        }
    }

    setMusicVolume(volume: number) {
        this.musicVolume.set(volume);
        if (this.musicGainNode && this.audioContext) {
            this.musicGainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    toggleMusic() {
        if (!this.musicAudio) return;
        if (this.musicAudio.paused) {
            this.musicAudio.play().then(() => this.musicPlaying.set(true));
        } else {
            this.musicAudio.pause();
            this.musicPlaying.set(false);
        }
    }

    stopMusic() {
        if (!this.musicAudio) return;
        this.musicAudio.pause();
        this.musicAudio.currentTime = 0;
        this.musicPlaying.set(false);
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
                        const audioEl = track.attach() as HTMLAudioElement;
                        audioEl.autoplay = true;
                        audioEl.volume = 1.0;
                        audioEl.style.display = 'none'; // Hidden but in DOM
                        document.body.appendChild(audioEl);
                        this.audioElements.set(participant.identity, audioEl);
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

            // Initialize AudioContext mixer and microphone
            await this.initAudioMixer();
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Capture mic stream
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (this.audioContext && this.mixedDestination) {
                this.micSourceNode = this.audioContext.createMediaStreamSource(this.micStream);
                this.micSourceNode.connect(this.mixedDestination);

                // Publish mixed stream track to LiveKit
                const mixedTrack = this.mixedDestination.stream.getAudioTracks()[0];
                this.localAudioTrack = new LocalAudioTrack(mixedTrack);
                await newRoom.localParticipant.publishTrack(this.localAudioTrack);
                this.isMuted.set(false);
                console.log('[VoiceService] Mixed microphone and music track published successfully');
            } else {
                // Fallback to default behavior if audio mixing setup failed
                await newRoom.localParticipant.setMicrophoneEnabled(true);
                this.isMuted.set(false);
                console.log('[VoiceService] Fallback: Microphone enabled');
            }

            this.room = newRoom;

            // Start local audio-level polling every 100ms
            this.startAudioLevelPolling(newRoom);

        } catch (e: any) {
            console.error('[VoiceService] Error connecting to LiveKit:', e);
            this.connectionError.set('Failed to connect: ' + e.message);
            this.isConnecting.set(false);
        }
    }

    private startAudioLevelPolling(lkRoom: Room) {
        if (this.audioPollingInterval) clearInterval(this.audioPollingInterval);
        this.audioPollingInterval = setInterval(() => {
            const activity = new Map<number, boolean>();

            // Local participant level
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
        // Handled internally.
    }

    async startCall(targetUserId: number) {
        // Handled internally.
    }

    removeParticipant(userId: number) {
        // Handled internally.
    }

    toggleMute() {
        const newMuted = !this.isMuted();
        if (this.localAudioTrack) {
            const promise = newMuted ? this.localAudioTrack.mute() : this.localAudioTrack.unmute();
            promise.then(() => {
                this.isMuted.set(newMuted);
                console.log('[VoiceService] Custom track mute set:', newMuted);
            }).catch(err => {
                console.error('[VoiceService] Custom track mute failed:', err);
            });
        } else if (this.room) {
            this.room.localParticipant.setMicrophoneEnabled(!newMuted).then(() => {
                this.isMuted.set(newMuted);
                console.log('[VoiceService] Fallback mic mute set:', newMuted);
            });
        }
    }

    retryConnection() {
        // Built-in
    }

    cleanup() {
        console.log('[VoiceService] Cleaning up LiveKit room');
        this.stopMusic();
        if (this.musicAudio) {
            this.musicAudio.src = '';
            this.musicAudio = null;
        }
        if (this.audioPollingInterval) {
            clearInterval(this.audioPollingInterval);
            this.audioPollingInterval = null;
        }
        this.audioElements.forEach(el => el.remove());
        this.audioElements.clear();
        if (this.room) {
            this.room.disconnect();
            this.room = null;
        }
        if (this.localAudioTrack) {
            this.localAudioTrack.stop();
            this.localAudioTrack = null;
        }
        if (this.micSourceNode) {
            this.micSourceNode.disconnect();
            this.micSourceNode = null;
        }
        if (this.musicSourceNode) {
            this.musicSourceNode.disconnect();
            this.musicSourceNode = null;
        }
        if (this.musicGainNode) {
            this.musicGainNode.disconnect();
            this.musicGainNode = null;
        }
        if (this.mixedDestination) {
            this.mixedDestination = null;
        }
        if (this.micStream) {
            this.micStream.getTracks().forEach(t => t.stop());
            this.micStream = null;
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
        this.musicFileName.set(null);
    }
}
