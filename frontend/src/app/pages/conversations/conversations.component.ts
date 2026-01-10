import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UnixDatePipe } from '../../pipes/unix-date.pipe';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-conversations',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe, UnixDatePipe],
    templateUrl: './conversations.component.html',
    styleUrl: './conversations.component.css'
})
export class ConversationsComponent implements OnInit, OnDestroy {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);
    public socketService = inject(SocketService);
    private subs = new Subscription();

    conversations: any[] = [];
    loading = true;
    error: string | null = null;
    currentUser: any;

    isDarkMode = signal(document.documentElement.getAttribute('data-theme') === 'dark');

    ngOnInit() {
        this.currentUser = this.auth.currentUserValue;
        if (this.currentUser) {
            this.loadConversations();
            this.setupSocketListeners();
        }
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
    }

    setupSocketListeners() {
        // Listen for incoming messages
        this.subs.add(this.socketService.messageReceived$.subscribe((msg: any) => {
            if (msg) this.handleNewMessage(msg, false);
        }));

        // Listen for sent messages
        this.subs.add(this.socketService.messageSent$.subscribe((msg: any) => {
            if (msg) this.handleNewMessage(msg, true);
        }));
    }

    handleNewMessage(msg: any, isSent: boolean) {
        // Determine partner ID
        // If sent by me, partner is the receiver (but message object might vary)
        // Usually msg.roomId = 'room_smallId_bigId'
        // msg.senderId

        // Find existing conversation
        // We need to parse roomId or check participants if not available in msg object properly
        const partnerId = isSent
            ? (msg.roomId ? this.getPartnerIdFromRoom(msg.roomId) : null)
            : Number(msg.senderId || msg.sender_id);

        if (!partnerId) return;

        const index = this.conversations.findIndex(c => Number(c.partner_id) === partnerId);

        if (index > -1) {
            // Update existing
            const conv = this.conversations[index];
            conv.last_message = msg.content;
            conv.last_message_time = msg.createdAt || msg.created_at || Date.now();
            if (!isSent) {
                conv.unread_count = (conv.unread_count || 0) + 1;
            }

            // Move to top
            this.conversations.splice(index, 1);
            this.conversations.unshift(conv);
        } else {
            // New conversation? Reload list to get full details properly
            this.loadConversations();
        }
    }

    getPartnerIdFromRoom(roomId: string): number | null {
        if (!roomId) return null;
        const parts = roomId.split('_');
        if (parts.length < 3) return null;
        const id1 = Number(parts[1]);
        const id2 = Number(parts[2]);
        return id1 === this.currentUser.id ? id2 : id1;
    }

    loadConversations() {
        this.loading = true;
        this.error = null;
        this.api.get(`/conversations?userId=${this.currentUser.id}`).subscribe({
            next: (data: any) => {
                // Normalize avatar URLs
                this.conversations = data.map((conv: any) => {
                    if (conv.partner_avatar && !conv.partner_avatar.startsWith('http')) {
                        conv.partner_avatar = `${this.api.phpBaseUrl}${conv.partner_avatar}`;
                    }
                    return conv;
                });
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading conversations', err);
                this.error = 'Failed to load conversations. Please try again later.';
                this.loading = false;
            }
        });
    }

    openConversation(event: Event, partnerId: number) {
        event.preventDefault();

        // Mark messages as read
        this.api.post('/conversations/read', {
            userId: this.currentUser.id,
            otherUserId: partnerId
        }).subscribe({
            next: () => {
                // Navigate to chat
                this.router.navigate(['/dashboard/chat', partnerId]);
            },
            error: (err) => {
                console.error('Error marking messages as read:', err);
                // Navigate anyway
                this.router.navigate(['/dashboard/chat', partnerId]);
            }
        });
    }

    toggleTheme() {
        const newTheme = this.isDarkMode() ? 'light' : 'dark';
        this.isDarkMode.set(!this.isDarkMode());
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    getMessagePreview(message: string): string {
        if (!message) return '';

        // Check for base64 image
        if (message.startsWith('data:image')) {
            return '📷 Image';
        }

        // Check for base64 audio
        if (message.startsWith('data:audio')) {
            return '🎤 Voice Message';
        }

        // Check if it's a very long string that looks like base64 but might not have the prefix
        // (Just in case, though usually they should have the prefix)
        if (message.length > 100 && !message.includes(' ') && (message.startsWith('/9j/') || message.startsWith('iVBOR'))) {
            return '📷 Image';
        }

        return message;
    }
}
