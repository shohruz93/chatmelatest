import { Component, OnInit, OnDestroy, inject, signal, computed, AfterViewChecked, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AdsterraBannerComponent } from '../../components/adsterra-banner/adsterra-banner.component';
import { VoiceChatService } from '../../services/voice-chat.service';

@Component({
    selector: 'app-voice-room',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, AdsterraBannerComponent],
    templateUrl: './voice-room.component.html',
    styleUrls: ['./voice-room.component.css']
})
export class VoiceRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
    private socketService = inject(SocketService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);
    public voiceChatService = inject(VoiceChatService);

    @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('musicFileInput') private musicFileInput?: ElementRef<HTMLInputElement>;

    roomId: string = '';
    myUserId: string = '';

    room = signal<any>(null);
    participants = signal<any[]>([]);
    messages = signal<any[]>([]);
    isMuted = signal<boolean>(false);

    newMessage: string = '';
    private shouldScrollToBottom = true;

    speakers = computed(() => this.participants().filter(p => p.isSpeaker));
    listeners = computed(() => this.participants().filter(p => !p.isSpeaker));
    isSpeaker = computed(() => {
        const myId = String(this.myUserId);
        return this.participants().some(p => (String(p.userId || p.id) === myId) && p.isSpeaker);
    });

    private subs: Subscription = new Subscription();

    ngOnInit() {
        this.roomId = this.route.snapshot.paramMap.get('roomId') || this.route.snapshot.paramMap.get('id') || '';
        console.log('[VoiceRoom] Room ID from route:', this.roomId);
        const user = this.socketService.getCurrentUser?.() || (window as any).currentUser;
        this.myUserId = String(user?.id || '');

        if (!this.roomId) {
            console.warn('[VoiceRoom] No roomId found, navigating back');
            this.router.navigate(['/dashboard/voice-rooms']);
            return;
        }

        // Join the room via socket with user profile
        this.socketService.joinVoiceRoom(this.roomId, {
            name: user?.name || `User ${this.myUserId}`,
            avatar: user?.avatar || user?.photo_url || user?.photoUrl || ''
        });

        // Initialize LiveKit connection
        if (this.myUserId) {
            this.voiceChatService.setMyUserId(Number(this.myUserId));
        }
        this.voiceChatService.joinRoom(this.roomId);

        this.subs.add(this.socketService.voiceRoomState$.subscribe((data: any) => {
            console.log('[VoiceRoom] Received room state:', data);
            if (!data) return;

            // Reconstruct room object from root properties
            this.room.set({
                id: data.roomId,
                topic: data.topic,
                language: data.language,
                hostId: data.isHost ? this.myUserId : null // host ID mapping
            });

            // Map participants and assign isSpeaker based on speakers ID array
            const speakersSet = new Set((data.speakers || []).map((id: any) => String(id)));
            const mappedParticipants = (data.participants || []).map((p: any) => {
                const pId = String(p.userId || p.id);
                return {
                    ...p,
                    userId: pId,
                    isSpeaker: speakersSet.has(pId)
                };
            });
            this.participants.set(mappedParticipants);

            // Map initial room chat history
            if (data.messages && Array.isArray(data.messages)) {
                const mappedMessages = data.messages.map((m: any) => ({
                    id: m.id,
                    userId: String(m.senderId),
                    name: m.senderName || `User ${m.senderId}`,
                    avatar: m.avatar,
                    text: m.content,
                    time: m.createdAt ? new Date(m.createdAt * 1000) : new Date(),
                    is_vip: m.is_vip
                }));
                this.messages.set(mappedMessages);
            }
        }));

        this.subs.add(this.socketService.on$('speaker_added').subscribe((data: any) => {
            if (data) {
                const targetId = String(data.userId);
                this.participants.update(arr =>
                    arr.map(p => {
                        const pId = String(p.userId || p.id);
                        return pId === targetId ? { ...p, isSpeaker: true } : p;
                    })
                );
            }
        }));

        this.subs.add(this.socketService.on$('speaker_removed').subscribe((data: any) => {
            if (data) {
                const targetId = String(data.userId);
                this.participants.update(arr =>
                    arr.map(p => {
                        const pId = String(p.userId || p.id);
                        return pId === targetId ? { ...p, isSpeaker: false } : p;
                    })
                );
            }
        }));

        this.subs.add(this.socketService.voiceChatMessage$.subscribe((msg: any) => {
            if (msg && msg.roomId === this.roomId) {
                this.shouldScrollToBottom = true;
                const mapped = {
                    id: msg.id,
                    userId: String(msg.senderId),
                    name: msg.senderName || `User ${msg.senderId}`,
                    avatar: msg.avatar,
                    text: msg.content,
                    time: msg.createdAt ? new Date(msg.createdAt * 1000) : new Date(),
                    is_vip: msg.is_vip
                };
                this.messages.update(arr => [...arr, mapped]);
            }
        }));

        this.subs.add(this.socketService.voiceUserJoined$.subscribe((p: any) => {
            if (p && p.user) {
                const newUser = {
                    ...p.user,
                    userId: String(p.userId || p.user.id || p.user.userId),
                    isSpeaker: false
                };
                this.participants.update(arr => [...arr, newUser]);
            }
        }));

        this.subs.add(this.socketService.voiceUserLeft$.subscribe((p: any) => {
            if (p) this.participants.update(arr => arr.filter(x => String(x.userId) !== String(p.userId) && String(x.id) !== String(p.userId)));
        }));

        this.subs.add(this.socketService.on$('voice_user_mute_toggled').subscribe((data: any) => {
            if (data) {
                this.participants.update(arr =>
                    arr.map(p => (p.id === data.userId || p.userId === data.userId) ? { ...p, isMuted: data.isMuted } : p)
                );
            }
        }));

        this.subs.add(this.socketService.voiceRoomClosed$.subscribe(() => {
            this.router.navigate(['/dashboard/voice-rooms']);
        }));
    }

    ngAfterViewChecked() {
        if (this.shouldScrollToBottom && this.messagesContainer) {
            const el = this.messagesContainer.nativeElement;
            el.scrollTop = el.scrollHeight;
            this.shouldScrollToBottom = false;
        }
    }

    getAvatarUrl(avatar: string): string {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        return environment.phpBaseUrl + avatar;
    }

    toggleMute() {
        const next = !this.isMuted();
        this.isMuted.set(next);
        this.socketService.setVoiceMute(this.roomId, next);
        this.voiceChatService.toggleMute();
    }

    openMusicFilePicker() {
        if (this.musicFileInput?.nativeElement) {
            this.musicFileInput.nativeElement.value = '';
            this.musicFileInput.nativeElement.click();
        } else {
            // Fallback: find and click any file input
            const input = document.querySelector('input[type="file"][accept="audio/*"]') as HTMLInputElement;
            if (input) { input.value = ''; input.click(); }
        }
    }

    onMusicFileSelected(event: any) {
        const file = event.target.files?.[0];
        if (file) {
            this.voiceChatService.setMusicFile(file);
            this.cdr.detectChanges();
        }
    }

    onVolumeChange(event: any) {
        const vol = parseFloat(event.target.value);
        this.voiceChatService.setMusicVolume(vol);
    }

    sendMessage(e: Event) {
        e.preventDefault();
        const text = this.newMessage.trim();
        if (!text) return;
        console.log('[VoiceRoom] Sending message:', text);
        const user = this.socketService.getCurrentUser?.() || (window as any).currentUser;
        this.socketService.sendVoiceRoomMessage(
            this.roomId,
            text,
            user?.name || `User ${this.myUserId}`,
            user?.avatar || user?.photo_url || user?.photoUrl || ''
        );
        this.newMessage = '';
    }

    leaveRoom() {
        this.socketService.leaveVoiceRoom(this.roomId);
        this.voiceChatService.cleanup();
        this.router.navigate(['/dashboard/voice-rooms']);
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
        this.socketService.leaveVoiceRoom(this.roomId);
        this.voiceChatService.cleanup();
    }
}