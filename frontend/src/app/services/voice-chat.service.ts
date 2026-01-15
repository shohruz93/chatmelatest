import { Injectable, signal, inject } from '@angular/core';
import { SocketService } from './socket.service';

@Injectable({
    providedIn: 'root'
})
export class VoiceChatService {
    private socket = inject(SocketService);
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private currentTargetUserId: number | null = null;
    private connectionTimeout: any = null;
    private iceGatheringTimeout: any = null;
    private retryCount = 0;
    private maxRetries = 3;

    // Signals for UI state
    isActive = signal(false);
    isMuted = signal(false);
    isRemoteAudioPlaying = signal(false);
    connectionError = signal<string | null>(null);
    isConnecting = signal(false);

    private config: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    constructor() {
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.socket.on('voice_offer').subscribe(async (data: any) => {
            console.log('[VoiceService] Received offer', data);
            await this.handleOffer(data.offer, data.senderId);
        });

        this.socket.on('voice_answer').subscribe(async (data: any) => {
            console.log('[VoiceService] Received answer', data);
            await this.handleAnswer(data.answer);
        });

        this.socket.on('voice_candidate').subscribe(async (data: any) => {
            console.log('[VoiceService] Received candidate', data);
            await this.handleCandidate(data.candidate);
        });

        this.socket.on('voice_error').subscribe((data: any) => {
            console.error('[VoiceService] Voice error:', data);
            this.connectionError.set(data.message || 'Voice connection failed');
            this.isConnecting.set(false);
            this.cleanup();
        });
    }

    async startCall(targetUserId: number) {
        console.log('[VoiceService] Starting call to', targetUserId);
        this.currentTargetUserId = targetUserId;
        this.isConnecting.set(true);
        this.connectionError.set(null);

        await this.initializePeerConnection(targetUserId);
        if (!this.peerConnection) {
            this.isConnecting.set(false);
            return;
        }

        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socket.emit('voice_offer', { targetUserId, offer });
            this.isActive.set(true);
            this.isConnecting.set(false);

            // Set connection timeout (30 seconds)
            this.connectionTimeout = setTimeout(() => {
                if (this.peerConnection?.connectionState !== 'connected') {
                    console.error('[VoiceService] Connection timeout');
                    this.connectionError.set('Connection timeout - please try again');
                    this.cleanup();
                }
            }, 30000);
        } catch (e) {
            console.error('[VoiceService] Error creating offer:', e);
            this.connectionError.set('Failed to create voice connection');
            this.isConnecting.set(false);
            this.cleanup();
        }
    }

    private async handleOffer(offer: RTCSessionDescriptionInit, senderId: number) {
        if (this.isActive()) {
            console.log('[VoiceService] Already in call, ignoring offer'); // Or handle collision
            // return; 
        }

        await this.initializePeerConnection(senderId);
        try {
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);
            this.socket.emit('voice_answer', { targetUserId: senderId, answer });
            this.isActive.set(true);
        } catch (e) {
            console.error('[VoiceService] Error handling offer:', e);
        }
    }

    private async handleAnswer(answer: RTCSessionDescriptionInit) {
        if (!this.peerConnection) return;
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
            console.error('[VoiceService] Error handling answer:', e);
        }
    }

    private async handleCandidate(candidate: RTCIceCandidateInit) {
        if (!this.peerConnection) return;
        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('[VoiceService] Error adding candidate:', e);
        }
    }

    private async initializePeerConnection(targetUserId: number) {
        this.cleanup(); // Close existing if any

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e: any) {
            console.error('[VoiceService] Error getting user media:', e);
            if (e.name === 'NotAllowedError') {
                this.connectionError.set('Microphone permission denied. Please allow microphone access.');
            } else if (e.name === 'NotFoundError') {
                this.connectionError.set('No microphone found. Please connect a microphone.');
            } else {
                this.connectionError.set('Could not access microphone. Please check permissions.');
            }
            this.isConnecting.set(false);
            return;
        }

        this.peerConnection = new RTCPeerConnection(this.config);

        // Add local tracks
        this.localStream.getTracks().forEach(track => {
            this.peerConnection!.addTrack(track, this.localStream!);
        });

        // Handle remote tracks
        this.peerConnection.ontrack = (event) => {
            console.log('[VoiceService] Received remote track');
            this.remoteStream = event.streams[0];
            this.playRemoteAudio();
            this.clearTimeouts();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('voice_candidate', { targetUserId, candidate: event.candidate });
            }
        };

        // ICE gathering state monitoring
        this.peerConnection.onicegatheringstatechange = () => {
            console.log('[VoiceService] ICE gathering state:', this.peerConnection?.iceGatheringState);
            if (this.peerConnection?.iceGatheringState === 'complete') {
                if (this.iceGatheringTimeout) {
                    clearTimeout(this.iceGatheringTimeout);
                }
            }
        };

        // Connection state monitoring
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState;
            console.log('[VoiceService] Connection state:', state);

            if (state === 'connected') {
                this.clearTimeouts();
                this.retryCount = 0;
                this.connectionError.set(null);
            } else if (state === 'disconnected') {
                this.connectionError.set('Voice connection lost');
                this.attemptReconnect();
            } else if (state === 'failed') {
                this.connectionError.set('Voice connection failed');
                this.attemptReconnect();
            } else if (state === 'closed') {
                this.cleanup();
            }
        };

        // Set ICE gathering timeout
        this.iceGatheringTimeout = setTimeout(() => {
            if (this.peerConnection?.iceGatheringState !== 'complete') {
                console.warn('[VoiceService] ICE gathering timeout');
            }
        }, 10000);
    }

    private playRemoteAudio() {
        const audioElement = new Audio();
        audioElement.srcObject = this.remoteStream;
        audioElement.autoplay = true;
        audioElement.play().then(() => {
            this.isRemoteAudioPlaying.set(true);
        }).catch(e => console.error('[VoiceService] Error playing active stream:', e));
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted.set(!audioTrack.enabled); // enabled=true means NOT muted
            }
        }
    }

    private clearTimeouts() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.iceGatheringTimeout) {
            clearTimeout(this.iceGatheringTimeout);
            this.iceGatheringTimeout = null;
        }
    }

    private attemptReconnect() {
        if (this.retryCount < this.maxRetries && this.currentTargetUserId) {
            this.retryCount++;
            console.log(`[VoiceService] Attempting reconnect ${this.retryCount}/${this.maxRetries}`);
            setTimeout(() => {
                if (this.currentTargetUserId) {
                    this.startCall(this.currentTargetUserId);
                }
            }, 2000 * this.retryCount); // Exponential backoff
        } else {
            console.error('[VoiceService] Max retries reached');
            this.cleanup();
        }
    }

    cleanup() {
        this.clearTimeouts();

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.remoteStream = null;
        this.currentTargetUserId = null;
        this.retryCount = 0;
        this.isActive.set(false);
        this.isMuted.set(false);
        this.isRemoteAudioPlaying.set(false);
        this.isConnecting.set(false);
    }

    // Public method to retry connection
    retryConnection() {
        if (this.currentTargetUserId) {
            this.retryCount = 0;
            this.startCall(this.currentTargetUserId);
        }
    }
}
