import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { VoiceChatService } from '../../services/voice-chat.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    participants = signal<any[]>([]);
    messages = signal<any[]>([]);
    currentUser: any;
    newMessage: string = '';

    private subs: Subscription = new Subscription();

    constructor() {
        // Auto-scroll effect
        effect(() => {
            this.messages(); // Dependency
            setTimeout(() => this.scrollToBottom(), 100);
        });

        // Sync speaking state from voiceService
        effect(() => {
            const activity = this.voiceService.speakerActivity();
            const current = this.participants();

            if (current.length === 0) return;

            let changed = false;
            const updated = current.map(p => {
                const isSpeaking = p.isSelf ? !!activity.get(0) : !!activity.get(p.id);
                if (p.isSpeaking !== isSpeaking) {
                    changed = true;
                    return { ...p, isSpeaking };
                }
                return p;
            });

            if (changed) {
                this.participants.set(updated);
            }
        });
    }

    connected = signal(false);
    isJoined = false;

    ngOnInit() {
        this.currentUser = this.auth.currentUserValue;

        // Setup socket event listeners FIRST so we don't miss events
        this.setupSocketEvents();

        this.subs.add(this.route.paramMap.subscribe(params => {
            this.roomId = params.get('roomId');
            this.isJoined = false; // Reset joined state on room change
            this.participants.set([]); // Clear participants
            this.messages.set([]);    // Clear messages

            // Add myself immediately so the participant grid is not empty
            // Add myself immediately so the participant grid is not empty
            if (this.currentUser) {
                let avatar = this.currentUser.avatar || '';
                if (avatar && !avatar.startsWith('http')) {
                    avatar = environment.phpBaseUrl + avatar;
                }
                this.participants.set([{
                    id: this.currentUser.id,
                    name: this.currentUser.name || `User ${this.currentUser.id}`,
                    avatar: avatar,
                    isSelf: true
                }]);
            }
            this.attemptJoin();
        }));

        this.subs.add(this.socketService.connectionState$.subscribe(connected => {
            this.connected.set(connected);
            if (!connected) {
                this.isJoined = false; // Reset on disconnect so we rejoin
                this.voiceService.cleanup();
            }
            if (connected) {
                this.attemptJoin();
            }
        }));
    }

    async attemptJoin() {
        if (this.roomId && this.socketService.connectionState$ && !this.isJoined) {
            console.log('[VoiceRoom] Joining room:', this.roomId);

            try {
                await this.voiceService.initLocalStream();
            } catch (e) {
                console.warn('[VoiceRoom] Could not init stream, joining anyway as listener');
            }

            const profile = {
                name: this.currentUser?.name || `User ${this.currentUser?.id}`,
                avatar: this.currentUser?.avatar || ''
            };
            this.socketService.joinVoiceRoom(this.roomId, profile);
            this.isJoined = true; // Prevent duplicate joins
        }
    }

    setupSocketEvents() {
        // Room Joined (Initial data from server) — includes ALL current participants
        this.subs.add(this.socketService.voiceRoomJoined$.subscribe((data: any) => {
            console.log('[VoiceRoom] Room joined data:', data);
            if (data && data.roomId === this.roomId) {
                this.topic = data.topic || 'Voice Room';

                // participants is array of {id, name, avatar} or just IDs
                const serverParticipants = (data.participants || []).map((p: any) => {
                    const id = (typeof p === 'object') ? (p.id ?? p.userId) : p;
                    const name = (typeof p === 'object') ? p.name : `User ${id}`;
                    let avatar = (typeof p === 'object') ? p.avatar : '';

                    // Prepend base URL if relative
                    if (avatar && !avatar.startsWith('http')) {
                        avatar = environment.phpBaseUrl + avatar;
                    }

                    return {
                        id: id,
                        name: name,
                        avatar: avatar,
                        isSpeaking: false,
                        isSelf: String(id) === String(this.currentUser?.id)
                    };
                });

                // Ensure self is in the list even if not returned by server yet (should be there)
                if (this.currentUser && !serverParticipants.find((p: any) => String(p.id) === String(this.currentUser.id))) {
                    serverParticipants.push({
                        id: this.currentUser.id,
                        name: this.currentUser.name || `User ${this.currentUser.id}`,
                        avatar: this.currentUser.avatar || '',
                        isSpeaking: false,
                        isSelf: true
                    });
                }

                this.participants.set(serverParticipants);
                if (data.messages) {
                    this.messages.set(data.messages);
                }
                this.cdr.markForCheck();
            }
        }));

        // Another user joined the room
        this.subs.add(this.socketService.voiceUserJoined$.subscribe((data: any) => {
            console.log('[VoiceRoom] User joined event:', data);
            const current = this.participants();
            const user = data.user || { id: data.userId, name: `User ${data.userId}`, avatar: '' };

            // Normalize user object
            let avatar = user.avatar ?? '';
            if (avatar && !avatar.startsWith('http')) {
                avatar = environment.phpBaseUrl + avatar;
            }

            const newUser = {
                id: user.id ?? user.userId ?? data.userId,
                name: user.name ?? `User ${user.id ?? user.userId ?? data.userId}`,
                avatar: avatar,
                isSpeaking: false,
                isSelf: String(user.id ?? data.userId) === String(this.currentUser?.id)
            };

            if (!current.find((p: any) => String(p.id) === String(newUser.id))) {
                this.participants.set([...current, newUser]);
                this.cdr.markForCheck();

                // We are an existing participant, a new user joined.
                // Initiate call to them.
                if (newUser.id !== this.currentUser?.id) {
                    this.voiceService.startCall(newUser.id);
                }
            }
        }));

        // User left
        this.subs.add(this.socketService.voiceUserLeft$.subscribe((data: any) => {
            const current = this.participants();
            const userId = Number(data.userId);
            this.participants.set(current.filter((p: any) => String(p.id) !== String(data.userId)));
            this.voiceService.removeParticipant(userId);
            this.cdr.markForCheck();
        }));

        // Chat Message
        this.subs.add(this.socketService.voiceChatMessage$.subscribe((message: any) => {
            console.log('[VoiceRoom] Message received:', message);
            if (message.roomId === this.roomId) {
                this.messages.update(msgs => {
                    if (msgs.find(m => m.id === message.id)) return msgs;
                    return [...msgs, message];
                });
                this.cdr.markForCheck();
            } else {
                console.warn('[VoiceRoom] Message ignored - roomId mismatch:', message.roomId, this.roomId);
            }
        }));
    }

    sendMessage() {
        if (!this.newMessage.trim() || !this.roomId) return;

        this.socketService.sendVoiceRoomMessage(
            this.roomId,
            this.newMessage,
            this.currentUser?.name,
            this.currentUser?.avatar
        );
        this.newMessage = '';
    }

    leaveRoom() {
        if (this.roomId) {
            this.socketService.leaveVoiceRoom(this.roomId);
            this.voiceService.cleanup();
            this.router.navigate(['/dashboard']);
        }
    }

    ngOnDestroy() {
        this.leaveRoom(); // Ensure we leave on navigation
        this.subs.unsubscribe();
    }

    scrollToBottom() {
        if (this.scrollContainer) {
            try {
                this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
            } catch (err) { }
        }
    }

    isMyMessage(msg: any): boolean {
        return String(msg.senderId) === String(this.currentUser?.id);
    }
}
