import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-conversations',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './conversations.component.html',
    styleUrl: './conversations.component.css'
})
export class ConversationsComponent implements OnInit {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);
    public socketService = inject(SocketService);

    conversations: any[] = [];
    loading = true;
    error: string | null = null;
    currentUser: any;

    isDarkMode = signal(document.documentElement.getAttribute('data-theme') === 'dark');

    ngOnInit() {
        this.currentUser = this.auth.currentUserValue;
        if (this.currentUser) {
            this.loadConversations();
        }
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
