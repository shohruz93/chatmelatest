import {
    Component, OnInit, OnDestroy, inject, signal, computed,
    ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { VoiceChatService } from '../../services/voice-chat.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

const MAX_STAGE_SLOTS = 8;

@Component({
    selector: 'app-voice-room',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './voice-room.component.html',
    styleUrls: ['./voice-room.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoiceRoomComponent implements OnInit, OnDestroy {
    @ViewChild('messagesContainer') private scrollContainer!: ElementRef;

    private socketService = inject(SocketService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    public auth = inject(AuthService);
    public voiceService = inject(VoiceChatService);
    private cdr = inject(ChangeDetectorRef);

    roomId: string | null = null;
    topic: string = 'Voice Room';
    language: string = 'EN';

    /** All participants in the room */
    participants = signal<any[]>([]);
    /** IDs of speakers on stage */
    speakerIds = signal<Set<number>>(new Set());

    messages = signal<any[]>([]);
    currentUser: any;
    newMessage: string = '';

    isHost: boolean = false;
    isOnStage: boolean = false;
    hasSentRequest: boolean = false;

    /** Pending stage requests (admin sees these as a dialog queue) */
    pendingRequests: Array<{ userId: number; userName: string; userAvatar: string }> = [];
    /** set of userIds that have pending requests (for badge indicator) */
    pendingRequestIds = new Set<number>();

    private subs: Subscription = new Subscription();
    private isJoined = false;

    constructor() {
        // Auto-scroll on new messages
        effect(() => {
            this.messages();
            setTimeout(() => this.scrollToBottom(), 80);
        });

        // Sync speaking state from WebRTC service
        effect(() => {
            const activity = this.voiceService.speakerActivity();
            const current = this.participants();
            if (!current.length) return;

            let changed = false;
            const updated = current.map(p => {
                const isSpeaking = p.isSelf ? !!activity.get(0) : !!activity.get(p.id);
                if (p.isSpeaking !== isSpeaking) { changed = true; return { ...p, isSpeaking }; }
                return p;
            });
            if (changed) { this.participants.set(updated); }
        });
    }

    // ─── Computed: Stage 8 fixed slots (null = empty) ────────────────────────
    stageSlots = computed<(any | null)[]>(() => {
        const ids = this.speakerIds();
        const all = this.participants();
        const slots: (any | null)[] = new Array(MAX_STAGE_SLOTS).fill(null);
        let i = 0;
        for (const p of all) {
            if (ids.has(Number(p.id)) && i < MAX_STAGE_SLOTS) {
                slots[i++] = p;
            }
        }
        return slots;
    });

    // ─── Computed: Audience (participants NOT on stage) ───────────────────────
    audienceParticipants = computed<any[]>(() => {
        const ids = this.speakerIds();
        return this.participants().filter(p => !ids.has(Number(p.id)));
    });

    // ─── Lifecycle ───────────────────────────────────────────────────────────
    ngOnInit() {
        this.currentUser = this.auth.currentUserValue;
        this.setupSocketEvents();

        this.subs.add(this.route.paramMap.subscribe(params => {
            this.roomId = params.get('roomId');
            this.isJoined = false;
            this.participants.set([]);
            this.messages.set([]);
            this.speakerIds.set(new Set());
            this.pendingRequests = [];
            this.pendingRequestIds.clear();
            this.hasSentRequest = false;
            this.isHost = false;
            this.isOnStage = false;

            // Immediately add self so grid isn't blank
            if (this.currentUser) {
                let avatar = this.currentUser.avatar || '';
                if (avatar && !avatar.startsWith('http')) avatar = environment.phpBaseUrl + avatar;
                this.participants.set([{
                    id: this.currentUser.id,
                    name: this.currentUser.name || `User ${this.currentUser.id}`,
                    avatar,
                    isSelf: true,
                    isSpeaking: false
                }]);
            }
            this.attemptJoin();
        }));

        this.subs.add(this.socketService.connectionState$.subscribe(connected => {
            if (!connected) { this.isJoined = false; this.voiceService.cleanup(); }
            if (connected) this.attemptJoin();
        }));
    }

    async attemptJoin() {
        if (!this.roomId || this.isJoined) return;
        this.isJoined = true;

        // Set local userId for WebRTC glare resolution
        if (this.currentUser?.id) {
            this.voiceService.setMyUserId(Number(this.currentUser.id));
        }

        try { await this.voiceService.initLocalStream(); }
        catch { console.warn('[VoiceRoom] Could not init mic, joining as listener'); }

        const profile = {
            name: this.currentUser?.name || `User ${this.currentUser?.id}`,
            avatar: this.currentUser?.avatar || ''
        };
        this.socketService.joinVoiceRoom(this.roomId, profile);
    }

    // ─── Socket Events ───────────────────────────────────────────────────────
    setupSocketEvents() {
        // Joined room – full snapshot
        this.subs.add(this.socketService.voiceRoomJoined$.subscribe((data: any) => {
            if (!data || data.roomId !== this.roomId) return;
            this.topic = data.topic || 'Voice Room';
            this.language = data.language || 'EN';
            this.isHost = !!data.isHost;
            this.isOnStage = !!data.isOnStage;

            const spk = new Set<number>((data.speakers || []).map((id: any) => Number(id)));
            this.speakerIds.set(spk);

            const mapped = (data.participants || []).map((p: any) => this.normalizeParticipant(p));
            this.participants.set(this.ensureSelf(mapped));
            if (data.messages) {
                const normalizedMsgs = (data.messages as any[]).map((msg: any) => {
                    if (msg.avatar && !msg.avatar.startsWith('http')) {
                        return { ...msg, avatar: environment.phpBaseUrl + msg.avatar };
                    }
                    return msg;
                });
                this.messages.set(normalizedMsgs);
            }

            // Initiate WebRTC calls to all existing participants in the room
            for (const p of mapped) {
                if (!p.isSelf && Number(p.id) !== Number(this.currentUser?.id)) {
                    this.voiceService.startCall(Number(p.id));
                }
            }
            this.cdr.markForCheck();
        }));

        // Someone joined
        this.subs.add(this.socketService.voiceUserJoined$.subscribe((data: any) => {
            const user = data.user || { id: data.userId, name: `User ${data.userId}`, avatar: '' };
            const np = this.normalizeParticipant(user);
            const current = this.participants();
            if (!current.find((p: any) => String(p.id) === String(np.id))) {
                this.participants.set([...current, np]);
                if (np.id !== this.currentUser?.id) this.voiceService.startCall(np.id);
            }
            this.cdr.markForCheck();
        }));

        // Someone left
        this.subs.add(this.socketService.voiceUserLeft$.subscribe((data: any) => {
            const uid = Number(data.userId);
            this.participants.update(list => list.filter(p => String(p.id) !== String(data.userId)));
            const newSpk = new Set(this.speakerIds());
            newSpk.delete(uid);
            this.speakerIds.set(newSpk);
            this.voiceService.removeParticipant(uid);
            this.pendingRequestIds.delete(uid);
            this.pendingRequests = this.pendingRequests.filter(r => r.userId !== uid);
            this.cdr.markForCheck();
        }));

        // Chat message
        this.subs.add(this.socketService.voiceChatMessage$.subscribe((message: any) => {
            if (message.roomId !== this.roomId) return;
            // Normalize avatar URL
            if (message.avatar && !message.avatar.startsWith('http')) {
                message = { ...message, avatar: environment.phpBaseUrl + message.avatar };
            }
            this.messages.update(msgs => msgs.find(m => m.id === message.id) ? msgs : [...msgs, message]);
            this.cdr.markForCheck();
        }));

        // Speaker added (approved or host)
        this.subs.add(this.socketService.on$('speaker_added').subscribe((data: any) => {
            if (data.roomId !== this.roomId) return;
            const newSpk = new Set(this.speakerIds());
            newSpk.add(Number(data.userId));
            this.speakerIds.set(newSpk);
            // If this is me, update my stage status
            if (String(data.userId) === String(this.currentUser?.id)) {
                this.isOnStage = true;
                this.hasSentRequest = false;
            }
            this.cdr.markForCheck();
        }));

        // Speaker removed
        this.subs.add(this.socketService.on$('speaker_removed').subscribe((data: any) => {
            if (data.roomId !== this.roomId) return;
            const newSpk = new Set(this.speakerIds());
            newSpk.delete(Number(data.userId));
            this.speakerIds.set(newSpk);
            if (String(data.userId) === String(this.currentUser?.id)) this.isOnStage = false;
            this.cdr.markForCheck();
        }));

        // Stage request received (host only)
        this.subs.add(this.socketService.on$('stage_request_received').subscribe((data: any) => {
            if (data.roomId !== this.roomId) return;
            this.pendingRequestIds.add(Number(data.userId));
            // Avoid duplicates
            if (!this.pendingRequests.find(r => r.userId === data.userId)) {
                let userAvatar = data.userAvatar || '';
                if (userAvatar && !userAvatar.startsWith('http')) {
                    userAvatar = environment.phpBaseUrl + userAvatar;
                }
                this.pendingRequests.push({ userId: data.userId, userName: data.userName, userAvatar });
            }
            this.cdr.markForCheck();
        }));

        // My request was rejected
        this.subs.add(this.socketService.on$('speaker_rejected').subscribe((data: any) => {
            if (data.roomId !== this.roomId) return;
            this.hasSentRequest = false;
            this.cdr.markForCheck();
        }));

        // Host changed
        this.subs.add(this.socketService.on$('voice_room_host_changed').subscribe((data: any) => {
            if (String(data.newHostId) === String(this.currentUser?.id)) {
                this.isHost = true;
                this.cdr.markForCheck();
            }
        }));
    }

    // ─── Admin Actions ───────────────────────────────────────────────────────
    approveSpeaker(userId: number) {
        if (!this.roomId) return;
        this.socketService.emit('approve_speaker', { roomId: this.roomId, userId });
        this.pendingRequests = this.pendingRequests.filter(r => r.userId !== userId);
        this.pendingRequestIds.delete(userId);
        this.cdr.markForCheck();
    }

    rejectSpeaker(userId: number) {
        if (!this.roomId) return;
        this.socketService.emit('reject_speaker', { roomId: this.roomId, userId });
        this.pendingRequests = this.pendingRequests.filter(r => r.userId !== userId);
        this.pendingRequestIds.delete(userId);
        this.cdr.markForCheck();
    }

    removeSpeaker(userId: number) {
        if (!this.roomId) return;
        this.socketService.emit('remove_speaker', { roomId: this.roomId, userId });
    }

    requestSpeakerSlot() {
        if (!this.roomId || this.hasSentRequest) return;
        this.hasSentRequest = true;
        this.socketService.emit('request_speaker_slot', { roomId: this.roomId });
    }

    onAudienceAvatarClick(p: any) {
        if (!this.isHost) return;
        // If they have a pending request, show approve/reject; otherwise invite manually
        if (this.pendingRequestIds.has(Number(p.id))) return; // Handled by dialog
        // Directly invite (approve without request) – admin privilege
        this.approveSpeaker(Number(p.id));
    }

    // ─── Chat ─────────────────────────────────────────────────────────────────
    sendMessage() {
        if (!this.newMessage.trim() || !this.roomId) return;
        let avatar = this.currentUser?.avatar || '';
        if (avatar && !avatar.startsWith('http')) {
            avatar = environment.phpBaseUrl + avatar;
        }
        this.socketService.sendVoiceRoomMessage(
            this.roomId, this.newMessage,
            this.currentUser?.name,
            avatar
        );
        this.newMessage = '';
    }

    isMyMessage(msg: any): boolean {
        return String(msg.senderId) === String(this.currentUser?.id);
    }

    // ─── Room ─────────────────────────────────────────────────────────────────
    leaveRoom() {
        if (this.roomId) {
            this.socketService.leaveVoiceRoom(this.roomId);
            this.router.navigate(['/dashboard']);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    private normalizeParticipant(p: any): any {
        const id = typeof p === 'object' ? (p.id ?? p.userId) : p;
        const name = typeof p === 'object' ? p.name : `User ${id}`;
        let avatar = typeof p === 'object' ? (p.avatar ?? '') : '';
        if (avatar && !avatar.startsWith('http')) avatar = environment.phpBaseUrl + avatar;
        return {
            id: Number(id),
            name,
            avatar,
            isSpeaking: false,
            isSelf: String(id) === String(this.currentUser?.id),
            isHost: String(id) === String(this.roomId?.split('_')[2]) // fallback
        };
    }

    private ensureSelf(list: any[]): any[] {
        if (!this.currentUser) return list;
        if (list.find((p: any) => String(p.id) === String(this.currentUser.id))) return list;
        let avatar = this.currentUser.avatar || '';
        if (avatar && !avatar.startsWith('http')) avatar = environment.phpBaseUrl + avatar;
        return [...list, { id: Number(this.currentUser.id), name: this.currentUser.name, avatar, isSelf: true, isSpeaking: false }];
    }

    scrollToBottom() {
        try { this.scrollContainer?.nativeElement.scrollTo({ top: this.scrollContainer.nativeElement.scrollHeight, behavior: 'smooth' }); }
        catch { }
    }

    ngOnDestroy() {
        this.leaveRoom();
        this.voiceService.cleanup();
        this.subs.unsubscribe();
    }
}
