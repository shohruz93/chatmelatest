import { Injectable, signal, inject } from '@angular/core';
import { SocketService } from './socket.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class VoiceChatService {
    private socket = inject(SocketService);

    // Multi-participant mesh: userId -> RTCPeerConnection
    private peerConnections = new Map<number, RTCPeerConnection>();
    private remoteStreams = new Map<number, MediaStream>();
    private audioElements = new Map<number, HTMLAudioElement>();
    private analysers = new Map<number, AnalyserNode>(); // userId -> Analyser
    private queuedCandidates = new Map<number, RTCIceCandidateInit[]>(); // userId -> queued ICE candidates
    private myUserId: number = 0; // Set from outside to resolve glare

    private audioContext: AudioContext | null = null;
    private localStream: MediaStream | null = null;
    private localAnalyser: AnalyserNode | null = null;

    // Signals for UI state
    isActive = signal(false);
    isMuted = signal(false);
    connectionError = signal<string | null>(null);
    isConnecting = signal(false);
    // Map of active speakers: userId -> isSpeaking
    public speakerActivity = signal<Map<number, boolean>>(new Map());

    private config: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ]
    };

    constructor() {
        this.setupSocketListeners();
    }

    /** Must be called before joining a room to enable glare resolution */
    setMyUserId(id: number) {
        this.myUserId = id;
    }

    private setupSocketListeners() {
        // Handle incoming offers from OTHER participants
        this.socket.on('voice_offer').subscribe(async (data: any) => {
            const senderId = Number(data.senderId);
            console.log('[VoiceService] Received offer from', senderId);
            await this.handleOffer(data.offer, senderId);
        });

        // Handle answers to OUR offers
        this.socket.on('voice_answer').subscribe(async (data: any) => {
            const senderId = Number(data.senderId);
            console.log('[VoiceService] Received answer from', senderId);
            await this.handleAnswer(data.answer, senderId);
        });

        // Handle candidates from ANY participant
        this.socket.on('voice_candidate').subscribe(async (data: any) => {
            const senderId = Number(data.senderId);
            console.log('[VoiceService] Received candidate from', senderId);
            await this.handleCandidate(data.candidate, senderId);
        });

        this.socket.on('voice_error').subscribe((data: any) => {
            console.error('[VoiceService] Voice error:', data);
            this.connectionError.set(data.message || 'Voice connection failed');
        });
    }

    /**
     * Initialize local media and prepare for connections
     */
    async initLocalStream() {
        if (this.localStream) return;

        try {
            console.log('[VoiceService] Getting local user media...');
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            // Monitor local stream
            const source = this.audioContext.createMediaStreamSource(this.localStream);
            this.localAnalyser = this.audioContext.createAnalyser();
            source.connect(this.localAnalyser);
            this.monitorLevel(0, this.localAnalyser); // 0 for local

            this.isActive.set(true);
            this.isMuted.set(false);
        } catch (e: any) {
            console.error('[VoiceService] Error getting user media:', e);
            if (e.name === 'NotAllowedError') {
                this.connectionError.set('Microphone permission denied.');
            } else {
                this.connectionError.set('Could not access microphone.');
            }
            throw e;
        }
    }

    /**
     * Start a call to a specific participant (mesh initiation)
     */
    async startCall(targetUserId: number) {
        const pc = this.getOrCreatePeerConnection(targetUserId);
        if (pc.signalingState !== 'stable') {
            console.log('[VoiceService] Skipping startCall - PC not stable:', pc.signalingState);
            return;
        }

        console.log('[VoiceService] Starting call to', targetUserId);
        await this.initLocalStream();

        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
            await pc.setLocalDescription(offer);
            this.socket.emit('voice_offer', { targetUserId: targetUserId, offer });
        } catch (e) {
            console.error('[VoiceService] Error creating offer for', targetUserId, e);
        }
    }

    private async handleOffer(offer: RTCSessionDescriptionInit, senderId: number) {
        const pc = this.getOrCreatePeerConnection(senderId);

        // Glare resolution: both sides sent offers simultaneously
        if (pc.signalingState === 'have-local-offer') {
            // "Polite peer" pattern: the side with the HIGHER userId yields (rollback)
            const isPolite = this.myUserId > senderId;
            if (isPolite) {
                console.log(`[VoiceService] Glare with ${senderId}: I am polite (my ID ${this.myUserId} > ${senderId}), rolling back`);
                try {
                    await pc.setLocalDescription({ type: 'rollback' } as any);
                } catch (e) {
                    console.warn('[VoiceService] Rollback failed, recreating PC for', senderId);
                    // If rollback not supported, recreate the peer connection
                    pc.close();
                    this.peerConnections.delete(senderId);
                    const newPc = this.getOrCreatePeerConnection(senderId);
                    return this.acceptOffer(newPc, offer, senderId);
                }
            } else {
                console.log(`[VoiceService] Glare with ${senderId}: I am impolite (my ID ${this.myUserId} <= ${senderId}), ignoring remote offer`);
                return;
            }
        } else if (pc.signalingState !== 'stable') {
            console.log('[VoiceService] Ignoring offer - PC state:', pc.signalingState);
            return;
        }

        await this.acceptOffer(pc, offer, senderId);
    }

    private async acceptOffer(pc: RTCPeerConnection, offer: RTCSessionDescriptionInit, senderId: number) {
        await this.initLocalStream();

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            this.flushQueuedCandidates(senderId, pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.socket.emit('voice_answer', { targetUserId: senderId, answer });
        } catch (e) {
            console.error('[VoiceService] Error handling offer from', senderId, e);
        }
    }

    private async handleAnswer(answer: RTCSessionDescriptionInit, senderId: number) {
        const pc = this.peerConnections.get(senderId);
        if (!pc) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            this.flushQueuedCandidates(senderId, pc);
        } catch (e) {
            console.error('[VoiceService] Error handling answer from', senderId, e);
        }
    }

    private async handleCandidate(candidate: RTCIceCandidateInit, senderId: number) {
        const pc = this.peerConnections.get(senderId);
        if (!pc) return;

        // Queue candidates until remoteDescription is set
        if (!pc.remoteDescription) {
            console.log(`[VoiceService] Queuing candidate for ${senderId} (no remoteDescription yet)`);
            if (!this.queuedCandidates.has(senderId)) {
                this.queuedCandidates.set(senderId, []);
            }
            this.queuedCandidates.get(senderId)!.push(candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('[VoiceService] Error adding candidate from', senderId, e);
        }
    }

    private async flushQueuedCandidates(userId: number, pc: RTCPeerConnection) {
        const queued = this.queuedCandidates.get(userId);
        if (queued && queued.length > 0) {
            console.log(`[VoiceService] Flushing ${queued.length} queued candidates for ${userId}`);
            for (const c of queued) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch (e) {
                    console.warn('[VoiceService] Error adding queued candidate:', e);
                }
            }
            this.queuedCandidates.delete(userId);
        }
    }

    private getOrCreatePeerConnection(userId: number): RTCPeerConnection {
        if (this.peerConnections.has(userId)) {
            return this.peerConnections.get(userId)!;
        }

        console.log('[VoiceService] Creating PeerConnection for', userId);
        const pc = new RTCPeerConnection(this.config);

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream!);
            });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            console.log('[VoiceService] Received remote track from', userId);
            const stream = event.streams[0];
            this.remoteStreams.set(userId, stream);
            this.playRemoteAudio(userId, stream);

            // Monitor remote stream
            if (this.audioContext) {
                const source = this.audioContext.createMediaStreamSource(stream);
                const analyser = this.audioContext.createAnalyser();
                source.connect(analyser);
                this.analysers.set(userId, analyser);
                this.monitorLevel(userId, analyser);
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('voice_candidate', { targetUserId: userId, candidate: event.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[VoiceService] Connection state for ${userId}:`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.removeParticipant(userId);
            }
        };

        this.peerConnections.set(userId, pc);
        return pc;
    }

    private playRemoteAudio(userId: number, stream: MediaStream) {
        // Remove existing if any
        this.stopRemoteAudio(userId);

        // ... handled via AudioContext logic for monitoring, but still need output
        const audio = new Audio();
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.play().catch(e => console.warn('[VoiceService] Play error (expected if no user interaction yet):', e));
        this.audioElements.set(userId, audio);
    }

    private monitorLevel(userId: number, analyser: AnalyserNode) {
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkValue = () => {
            if (!this.isActive()) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const isSpeaking = average > 15; // Threshold

            const current = this.speakerActivity();
            if (current.get(userId) !== isSpeaking) {
                const next = new Map(current);
                next.set(userId, isSpeaking);
                this.speakerActivity.set(next);
            }

            if (this.isActive()) {
                requestAnimationFrame(checkValue);
            }
        };

        requestAnimationFrame(checkValue);
    }

    private stopRemoteAudio(userId: number) {
        const audio = this.audioElements.get(userId);
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            this.audioElements.delete(userId);
        }
    }

    removeParticipant(userId: number) {
        console.log('[VoiceService] Removing participant', userId);
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
        }
        this.stopRemoteAudio(userId);
        this.remoteStreams.delete(userId);
        this.queuedCandidates.delete(userId);
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted.set(!audioTrack.enabled);
            }
        }
    }

    // Public method to retry connection (for backward compatibility)
    retryConnection() {
        this.peerConnections.forEach((pc, userId) => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.startCall(userId);
            }
        });
    }

    cleanup() {
        console.log('[VoiceService] Cleaning up all connections');
        this.peerConnections.forEach((pc, id) => {
            pc.close();
            this.stopRemoteAudio(id);
        });
        this.peerConnections.clear();
        this.remoteStreams.clear();
        this.audioElements.clear();
        this.queuedCandidates.clear();
        this.analysers.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close().catch(() => { });
            this.audioContext = null;
            this.localAnalyser = null;
        }

        this.isActive.set(false);
        this.isMuted.set(false);
        this.isConnecting.set(false);
        this.speakerActivity.set(new Map());
    }
}
