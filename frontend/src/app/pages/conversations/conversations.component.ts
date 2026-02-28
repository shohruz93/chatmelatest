import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UnixDatePipe } from '../../pipes/unix-date.pipe';
import { Subscription } from 'rxjs';
import { ChatStorageService } from '../../services/chat-storage.service';

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
    private storage = inject(ChatStorageService); // Injected ChatStorageService
    private subs = new Subscription();

    conversations: any[] = [];
    loading = true;
    error: string | null = null;
    currentUser: any;
    private hasLoadedConversations = false;

    isDarkMode = signal(document.documentElement.getAttribute('data-theme') === 'dark');

    async ngOnInit() { // Changed to async
        this.currentUser = this.auth.currentUserValue as any;
        if (this.currentUser) {
            // 1. Initialize DB and Load Cache
            try {
                await this.storage.openDb(this.currentUser.id);
                const cached: any[] = await this.storage.getConversations();
                if (cached && cached.length > 0) {
                    this.conversations = cached;
                    this.loading = false;
                }
            } catch (err: any) {
                console.warn('Storage error', err);
            }

            // 2. Trigger background refresh
            if (!this.hasLoadedConversations) {
                this.loadConversations();
                this.hasLoadedConversations = true;
            }
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

        // Check if user is currently viewing this chat room
        const currentUrl = this.router.url;
        const isInThisChat = currentUrl.includes(`/dashboard/chat/${partnerId}`);

        const index = this.conversations.findIndex(c => Number(c.partner_id) === partnerId);

        if (index > -1) {
            // Update existing
            const conv = this.conversations[index];
            conv.last_message = msg.content;
            conv.last_message_time = msg.createdAt || msg.created_at || Date.now();
            conv.last_message_sender_id = msg.senderId || msg.sender_id;
            conv.last_message_is_read = msg.is_read || (msg.status === 'read' ? 1 : 0);

            // Handle unread count:
            if (isSent || isInThisChat) { // Modified unread count logic
                conv.unread_count = 0;
            } else {
                // Only increment unread count if:
                // 1. Message was received (not sent by current user)
                // 2. User is NOT currently viewing this chat
                conv.unread_count = (conv.unread_count || 0) + 1;
            }

            // Move to top
            this.conversations.splice(index, 1);
            this.conversations.unshift(conv);

            // Persist to cache
            this.storage.saveConversations([conv]); // Save updated conversation to cache
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
        if (this.conversations.length === 0) this.loading = true; // Added conditional loading
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

                // Save to cache
                this.storage.saveConversations(this.conversations); // Save all conversations to cache

                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading conversations', err);
                if (this.conversations.length === 0) { // Added conditional error/loading
                    this.error = 'Failed to load conversations. Please try again later.';
                    this.loading = false;
                }
            }
        });
    }

    openConversation(event: Event, partnerId: number) {
        event.preventDefault();

        // Immediately update local state to clear unread count
        const index = this.conversations.findIndex(c => Number(c.partner_id) === partnerId);
        if (index > -1) {
            this.conversations[index].unread_count = 0;
        }

        // Mark messages as read on backend
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
                // Navigate anyway (local state is already updated)
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

        // Check for HTTP upload URLs
        if (message.includes('/uploads/images/') || message.includes('.jpg') || message.includes('.png')) {
            return '📷 Акс';
        }
        if (message.includes('/uploads/audio/') || message.includes('.m4a') || message.includes('.mp3')) {
            return '🎤 Садо';
        }

        // Check for base64 image
        if (message.startsWith('data:image')) {
            return '📷 Акс';
        }

        // Check for base64 audio
        if (message.startsWith('data:audio')) {
            return '🎤 Садо';
        }

        // Check if it's a very long string that looks like base64 but might not have the prefix
        // (Just in case, though usually they should have the prefix)
        if (message.length > 100 && !message.includes(' ') && (message.startsWith('/9j/') || message.startsWith('iVBOR'))) {
            return '📷 Акс';
        }

        return message;
    }
}
