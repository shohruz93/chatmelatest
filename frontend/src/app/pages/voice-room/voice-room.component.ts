import { Component, OnInit, OnDestroy, inject, signal, computed, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AdsterraBannerComponent } from '../../components/adsterra-banner/adsterra-banner.component';

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

    @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

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

    private subs: Subscription = new Subscription();

    ngOnInit() {
        this.roomId = this.route.snapshot.paramMap.get('id') || '';
        const user = this.socketService.getCurrentUser?.() || (window as any).currentUser;
        this.myUserId = user?.id || '';

        if (!this.roomId) {
            this.router.navigate(['/dashboard/voice-rooms']);
            return;
        }

        // Join the room via socket
        this.socketService.joinVoiceRoom(this.roomId);

        this.subs.add(this.socketService.voiceRoomState$.subscribe((data: any) => {
            if (!data) return;
            this.room.set(data.room || null);
            this.participants.set(data.participants || []);
        }));

        this.subs.add(this.socketService.voiceChatMessage$.subscribe((msg: any) => {
            if (msg && msg.roomId === this.roomId) {
                this.shouldScrollToBottom = true;
                this.messages.update(arr => [...arr, msg]);
            }
        }));

        this.subs.add(this.socketService.voiceUserJoined$.subscribe((p: any) => {
            if (p) this.participants.update(arr => [...arr, p]);
        }));

        this.subs.add(this.socketService.voiceUserLeft$.subscribe((p: any) => {
            if (p) this.participants.update(arr => arr.filter(x => x.userId !== p.userId && x.id !== p.userId));
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
    }

    sendMessage(e: Event) {
        e.preventDefault();
        const text = this.newMessage.trim();
        if (!text) return;
        this.socketService.sendVoiceRoomMessage(this.roomId, text);
        this.newMessage = '';
    }

    leaveRoom() {
        this.socketService.leaveVoiceRoom(this.roomId);
        this.router.navigate(['/dashboard/voice-rooms']);
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
        this.socketService.leaveVoiceRoom(this.roomId);
    }
}