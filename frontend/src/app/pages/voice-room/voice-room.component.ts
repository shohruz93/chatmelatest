import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

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
    }

    connected = signal(false);
    isJoined = false;

    ngOnInit() {
        this.currentUser = this.auth.currentUserValue;

        this.subs.add(this.route.paramMap.subscribe(params => {
            this.roomId = params.get('roomId');
            this.isJoined = false; // Reset joined state on room change
            this.attemptJoin();
        }));

        this.subs.add(this.socketService.connectionState$.subscribe(connected => {
            this.connected.set(connected);
            if (!connected) {
                this.isJoined = false; // Reset on disconnect so we rejoin
            }
            if (connected) {
                this.attemptJoin();
            }
        }));

        this.setupSocketEvents();
    }

    attemptJoin() {
        if (this.roomId && this.connected() && !this.isJoined) {
            console.log('[VoiceRoom] Joining room:', this.roomId);
            const profile = {
                name: this.currentUser?.name || `User ${this.currentUser?.id}`,
                avatar: this.currentUser?.avatar || ''
            };
            this.socketService.joinVoiceRoom(this.roomId, profile);
            this.isJoined = true; // Prevent duplicate joins
        }
    }

    setupSocketEvents() {
        // Room Joined (Initial data)
        this.subs.add(this.socketService.voiceRoomJoined$.subscribe((data: any) => {
            if (data.roomId === this.roomId) {
                this.topic = data.topic || 'Voice Room';
                // Participants are sent as array of IDs usually, or objects?
                // Android code: participants = participantsList (List<Int>)
                // We might need to fetch user details or if server sends full objects.
                // Let's assume server sends what Android expects.
                // Wait, Android `SocketManager` calls `voice_room_joined` parsing `participants` as `JSONArray` of INTs.
                // So we only get IDs. We might need to fetch profiles or just show placeholders.
                // For now, let's map IDs to dummy objects if they are just IDs.
                // Actually, `activeRooms` in server.js doesn't seem to have a `get_voice_room_details`.
                // But `voice_room_joined` event payload in `WebRTCManager` (Android) has `participants`.
                // Let's use what we get.

                // If data.participants is array of IDs, we need to fetch them? 
                // Or maybe we can't easily fetch them all yet without a specific endpoint.
                // Let's just store them for now.
                this.participants.set(data.participants || []); // Placeholder
                this.cdr.markForCheck();
            }
        }));

        // User Joined
        this.subs.add(this.socketService.voiceUserJoined$.subscribe((data: any) => {
            const current = this.participants();
            if (!current.includes(data.userId)) {
                this.participants.set([...current, data.userId]);
            }
        }));

        // User Left
        this.subs.add(this.socketService.voiceUserLeft$.subscribe((data: any) => {
            const current = this.participants();
            this.participants.set(current.filter(p => p !== data.userId));
        }));

        // Chat Message
        this.subs.add(this.socketService.voiceChatMessage$.subscribe((message: any) => {
            console.log('[VoiceRoom] Message received:', message);
            if (message.roomId === this.roomId) {
                this.messages.update(msgs => [...msgs, message]);
                this.cdr.markForCheck();
            } else {
                console.warn('[VoiceRoom] Message ignored - roomId mismatch:', message.roomId, this.roomId);
            }
        }));
    }

    sendMessage() {
        if (!this.newMessage.trim() || !this.roomId) return;

        // Optimistic update? No, ephemeral.
        const tempId = `temp_${Date.now()}`;
        const msg = {
            id: tempId,
            content: this.newMessage,
            senderId: this.currentUser?.id,
            senderName: this.currentUser?.name,
            avatar: this.currentUser?.avatar,
            timestamp: Date.now() / 1000, // seconds
            roomId: this.roomId,
            isEphemeral: true,
            type: 'text'
        };

        // Add locally? Only if we want to confirm sending. 
        // Usually socket broadcasts back to sender too? 
        // Android socket manager emits `voiceChatMessages` on `voice_chat_message` event.
        // Server `voice_room_message` handler: `io.to(roomId).emit('voice_chat_message', messageData);`
        // `io.to(roomId)` includes the sender if they are in the room.
        // So we don't need to add it manually here, it will come back via socket.

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
