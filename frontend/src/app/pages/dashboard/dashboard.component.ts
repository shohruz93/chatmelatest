import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { LanguageService } from '../../services/language.service';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../../services/gamification.service';
import { ChatStorageService } from '../../services/chat-storage.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, TranslatePipe],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
    private auth = inject(AuthService);
    public socketService = inject(SocketService);
    private api = inject(ApiService);
    private router = inject(Router);
    public ui = inject(UiService);
    public languageService = inject(LanguageService);
    public gameService = inject(GamificationService);
    private chatStorage = inject(ChatStorageService);
    private cdr = inject(ChangeDetectorRef);

    currentUser = this.auth.currentUserValue;
    isDarkMode = signal(false);
    showLangMenu = false;
    unreadCount = 0;
    newGuestsCount = 0;

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
        this.auth.user$.subscribe(user => {
            this.currentUser = user;
            if (this.currentUser) {
                this.updateUserInfo();
            }
        });

        let theme = localStorage.getItem('theme');
        if (!theme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        this.isDarkMode.set(theme === 'dark');
        document.documentElement.setAttribute('data-theme', theme);

        this.checkUnread();
        this.checkNewGuests();


        // Refresh unread/guests count on navigation
        this.router.events.subscribe(() => {
            this.checkUnread();
            this.checkNewGuests();
        });

        this.socketService.onMatchFound().subscribe(() => {
            this.socketService.isSearching.set(false);
            this.showFilterModal = false;
        });

        // Listen for new messages to update unread count
        this.chatStorage.messagesUpdated$.subscribe(() => {
            this.checkUnread();
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
            const oldUnreadCount = this.unreadCount;
            this.api.get(`/conversations?userId=${this.currentUser.id}`).subscribe({
                next: (data: any) => {
                    const total = data.reduce((acc: number, curr: any) => acc + parseInt(curr.unread_count || 0), 0);
                    this.unreadCount = total;
                    
                    if (this.unreadCount > oldUnreadCount) {
                        this.socketService.playNotificationSound();
                    }
                    this.cdr.detectChanges(); // Manually trigger change detection
                },
                error: () => this.unreadCount = 0
            });
        }
    }

    checkNewGuests() {
        if (this.currentUser) {
            this.api.getNewGuestsCount(this.currentUser.id).subscribe({
                next: (data: any) => {
                    this.newGuestsCount = data.count || 0;
                },
                error: () => this.newGuestsCount = 0
            });
        }
    }

    contactAdmin() {
        this.api.getAdminContact().subscribe({
            next: (admin: any) => {
                if (admin && admin.id) {
                    this.router.navigate(['/dashboard/chat', admin.id]);
                    // If on mobile sidebar, close it
                    if (window.innerWidth < 1024) {
                        this.ui.sidebarOpen.set(false);
                    }
                }
            },
            error: (err) => {
                console.error('Failed to get admin contact', err);
                alert('Support is currently unavailable.');
            }
        });
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

    updateUserInfo() {
        if (this.currentUser) {
            // Get avatar - database avatar takes priority over Google photoURL
            let avatar = this.currentUser.avatar || this.currentUser.photoURL || null;

            // Normalize avatar URL if it's a relative path
            if (avatar && !avatar.startsWith('http')) {
                avatar = `${this.api.phpBaseUrl}${avatar}`;
            }

            this.userAvatar = avatar;
            this.userDisplayName = this.currentUser.displayName || this.currentUser.name || 'User';
            this.userEmail = this.currentUser.email || '';

            // Update gamification state
            this.gameService.setWalletState(this.currentUser.coins, this.currentUser.xp);
        }
    }

    setLanguage(lang: string) {
        this.languageService.setLanguage(lang);
    }
}
