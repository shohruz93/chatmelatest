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

    // Signals for UI state
    isActive = signal(false);
    isMuted = signal(false);
    isRemoteAudioPlaying = signal(false);

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
    }

    async startCall(targetUserId: number) {
        console.log('[VoiceService] Starting call to', targetUserId);
        await this.initializePeerConnection(targetUserId);
        try {
            const offer = await this.peerConnection!.createOffer();
            await this.peerConnection!.setLocalDescription(offer);
            this.socket.emit('voice_offer', { targetUserId, offer });
            this.isActive.set(true);
        } catch (e) {
            console.error('[VoiceService] Error creating offer:', e);
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
        } catch (e) {
            console.error('[VoiceService] Error getting user media:', e);
            alert('Could not access microphone! Please check permissions.');
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
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('voice_candidate', { targetUserId, candidate: event.candidate });
            }
        };

        // Connection state monitoring
        this.peerConnection.onconnectionstatechange = () => {
            console.log('[VoiceService] Connection state:', this.peerConnection?.connectionState);
            if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
                this.cleanup();
            }
        };
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

    cleanup() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.remoteStream = null;
        this.isActive.set(false);
        this.isMuted.set(false);
        this.isRemoteAudioPlaying.set(false);
    }
}
