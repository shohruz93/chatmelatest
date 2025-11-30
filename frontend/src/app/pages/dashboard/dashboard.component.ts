import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
    private auth = inject(AuthService);
    public socketService = inject(SocketService);
    private api = inject(ApiService);
    private router = inject(Router);
    public ui = inject(UiService);

    currentUser = this.auth.currentUserValue;
    isDarkMode = signal(false);
    unreadCount = 0;

    userAvatar: string | null = null;
    userDisplayName: string = '';
    userEmail: string = '';

    languages = [
        { code: 'en', name: 'English' },
        { code: 'tj', name: 'Tajik' },
        { code: 'ru', name: 'Russian' }
    ];

    showFilterModal = false;
    filterGender: string = 'any';
    filterLocation: string = 'any';
    filterOnlineOnly: boolean = false;

    genderOptions = [
        { value: 'any', label: 'Any Gender' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' }
    ];

    locationOptions = [
        { value: 'any', label: 'Any Location' },
        { value: 'US', label: 'United States' },
        { value: 'UK', label: 'United Kingdom' },
        { value: 'RU', label: 'Russia' },
        { value: 'TJ', label: 'Tajikistan' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'TR', label: 'Turkey' }
    ];

    ngOnInit() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.isDarkMode.set(savedTheme === 'dark');
        document.documentElement.setAttribute('data-theme', savedTheme);

        if (this.currentUser) {
            // Get avatar - database avatar takes priority over Google photoURL
            let avatar = this.currentUser.avatar || this.currentUser.photoURL || null;

            // Normalize avatar URL if it's a relative path
            if (avatar && !avatar.startsWith('http')) {
                avatar = `http://localhost:8000${avatar}`;
            }

            this.userAvatar = avatar;
            this.userDisplayName = this.currentUser.displayName || this.currentUser.name || 'User';
            this.userEmail = this.currentUser.email || '';
        }

        this.checkUnread();

        // Refresh unread count on navigation
        this.router.events.subscribe(() => {
            this.checkUnread();
        });

        this.socketService.onMatchFound().subscribe(() => {
            this.socketService.isSearching.set(false);
            this.showFilterModal = false;
        });

        // Listen for new messages to update unread count
        this.socketService.onMessage().subscribe((message: any) => {
            // Use senderId (camelCase) as sent by server.js
            const senderId = message.senderId || message.sender_id;

            if (senderId !== this.currentUser.id) {
                // Only increment if we are not currently in the chat with this user
                if (this.router.url !== `/chat/${senderId}`) {
                    this.unreadCount++;
                    this.socketService.playNotificationSound();
                }
            }
        });
    }

    toggleTheme() {
        const newTheme = this.isDarkMode() ? 'light' : 'dark';
        this.isDarkMode.set(!this.isDarkMode());
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    checkUnread() {
        if (this.currentUser) {
            this.api.get(`/conversations?userId=${this.currentUser.id}`).subscribe({
                next: (data: any) => {
                    const total = data.reduce((acc: number, curr: any) => acc + parseInt(curr.unread_count || 0), 0);
                    this.unreadCount = total;
                },
                error: () => this.unreadCount = 0
            });
        }
    }

    findMatch() {
        if (this.socketService.isSearching()) return;
        this.showFilterModal = true;
    }

    closeFilterModal() {
        this.showFilterModal = false;
    }

    startSearch() {
        this.showFilterModal = false;
        if (this.router.url !== '/chat') {
            this.router.navigate(['/chat']).then(() => {
                this.startMatch();
            });
        } else {
            this.startMatch();
        }
    }

    private startMatch() {
        this.socketService.isSearching.set(true);

        const filters = {
            gender: this.filterGender,
            location: this.filterLocation,
            onlineOnly: this.filterOnlineOnly
        };

        const myProfile = {
            gender: (this.currentUser as any)?.gender || '',
            location: (this.currentUser as any)?.location || ''
        };

        this.socketService.findMatch(
            this.currentUser?.interests || [],
            this.socketService.selectedLanguage(),
            filters,
            myProfile
        );

        setTimeout(() => {
            this.socketService.isSearching.set(false);
        }, 30000);
    }

    onLanguageChange(event: any) {
        this.socketService.selectedLanguage.set(event.target.value);
    }
}
