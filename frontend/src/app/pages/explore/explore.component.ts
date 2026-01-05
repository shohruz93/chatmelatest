
import { Component, OnInit, OnDestroy, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CountryService } from '../../services/country.service';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AppVersionService } from '../../services/app-version.service';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface UserProfile {
    id: number;
    name: string;
    email: string;
    avatar: string;
    gender: string;
    location: string;
    bio: string;
    native_language: string | string[];
    learning_language: string | string[];
    isOnline?: boolean;
    last_active?: string;
    interests?: { id: number; name: string }[];
}

@Component({
    selector: 'app-explore',
    standalone: true,
    imports: [CommonModule, FormsModule, UserProfileModalComponent, TranslatePipe, RouterLink],
    templateUrl: './explore.component.html',
    styleUrls: ['./explore.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExploreComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private socketService = inject(SocketService);
    private auth = inject(AuthService);
    private api = inject(ApiService);
    private countryService = inject(CountryService);
    private appVersionService = inject(AppVersionService);

    users: UserProfile[] = [];
    filteredUsers: UserProfile[] = [];
    currentUser: any;
    isLoading = signal(false);
    selectedUser: UserProfile | null = null;
    updateAvailable = signal<any>(null);

    // Filters
    filterStatus: string = 'any';
    filterGender: string = 'any';
    filterLocation: string = 'any';
    filterNativeLanguage: string = 'any';
    filterLearningLanguage: string = 'any';

    statusOptions = [
        { value: 'any', label: 'EXPLORE_PAGE.ANY_STATUS' },
        { value: 'online', label: 'EXPLORE_PAGE.ONLINE_ONLY' },
        { value: 'offline', label: 'EXPLORE_PAGE.OFFLINE' }
    ];

    genderOptions = [
        { value: 'any', label: 'EXPLORE_PAGE.ANY_GENDER' },
        { value: 'male', label: 'EXPLORE_PAGE.MALE' },
        { value: 'female', label: 'EXPLORE_PAGE.FEMALE' }
    ];

    // Use CountryService for location options
    get locationOptions() {
        return this.countryService.getCountryOptions(true);
    }

    // Use CountryService for language options
    get languageOptions() {
        return this.countryService.getLanguageOptions(true);
    }

    // Dropdown toggle states
    showLocationDropdown = false;
    showNativeLanguageDropdown = false;
    showLearningLanguageDropdown = false;

    // Filter panel visibility (default hidden) - use signal for reactivity
    showFilters = signal(false);

    // Dropdown toggle methods
    toggleLocationDropdown() {
        this.showLocationDropdown = !this.showLocationDropdown;
        this.showNativeLanguageDropdown = false;
        this.showLearningLanguageDropdown = false;
    }

    toggleNativeLanguageDropdown() {
        this.showNativeLanguageDropdown = !this.showNativeLanguageDropdown;
        this.showLocationDropdown = false;
        this.showLearningLanguageDropdown = false;
    }

    toggleLearningLanguageDropdown() {
        this.showLearningLanguageDropdown = !this.showLearningLanguageDropdown;
        this.showLocationDropdown = false;
        this.showNativeLanguageDropdown = false;
    }

    selectLocation(value: string) {
        this.filterLocation = value;
        this.showLocationDropdown = false;
        this.onFilterChange();
    }

    selectNativeLanguage(value: string) {
        this.filterNativeLanguage = value;
        this.showNativeLanguageDropdown = false;
        this.onFilterChange();
    }

    selectLearningLanguage(value: string) {
        this.filterLearningLanguage = value;
        this.showLearningLanguageDropdown = false;
        this.onFilterChange();
    }

    getSelectedLocationLabel(): string {
        const option = this.locationOptions.find(o => o.value === this.filterLocation);
        return option?.label || 'Any Location';
    }

    getSelectedLocationFlag(): string {
        const option = this.locationOptions.find(o => o.value === this.filterLocation);
        return option?.flagUrl || '';
    }

    getSelectedNativeLanguageLabel(): string {
        const option = this.languageOptions.find(o => o.value === this.filterNativeLanguage);
        return option?.label || 'Any Language';
    }

    getSelectedNativeLanguageFlag(): string {
        const option = this.languageOptions.find(o => o.value === this.filterNativeLanguage);
        return option?.flagUrl || '';
    }

    getSelectedLearningLanguageLabel(): string {
        const option = this.languageOptions.find(o => o.value === this.filterLearningLanguage);
        return option?.label || 'Any Language';
    }

    getSelectedLearningLanguageFlag(): string {
        const option = this.languageOptions.find(o => o.value === this.filterLearningLanguage);
        return option?.flagUrl || '';
    }


    // Expose Array to template
    Array = Array;

    showValidationMessage = signal(false);

    hasIncompleteProfile() {
        if (!this.currentUser) return false;
        const hasNative = !!this.currentUser?.native_language && 
                         this.currentUser.native_language !== '' && 
                         this.currentUser.native_language !== 'any';
        const hasLearning = !!this.currentUser?.learning_language && 
                           this.currentUser.learning_language !== '' && 
                           this.currentUser.learning_language !== 'any';
        return !hasNative || !hasLearning;
    }

    constructor() {
        // React to online users changes
        effect(() => {
            // This dependency ensures the effect runs when onlineUsers signal changes
            this.socketService.onlineUsers();

            this.updateUserStatuses();

            // Re-apply filters if status filter is active
            if (this.filterStatus !== 'any') {
                this.applyFilters();
            }
        });
    }

    async ngOnInit() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
                // Fetch latest profile to ensure we have current languages/interests
                const latestProfile = await lastValueFrom(this.api.get(`/profile?userId=${this.currentUser.id}`));
                if (latestProfile) {
                    this.currentUser = { ...this.currentUser, ...latestProfile };
                    this.auth.updateUser(this.currentUser);
                }
            } catch (e) {
                console.error('Failed to sync profile:', e);
            }
        }

        if (this.hasIncompleteProfile()) {
            this.showValidationMessage.set(true);
        }

        this.loadUsers();

        // Listen for online status updates
        this.socketService.on('user_status_changed').subscribe((data: any) => {
            const user = this.users.find(u => u.id === data.userId);
            if (user) {
                user.isOnline = data.status === 'online';
                this.applyFilters();
            }
        });

        this.checkForUpdates();
    }

    async checkForUpdates() {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios' || platform === 'android') {
            try {
                const info = await App.getInfo();
                const currentBuild = parseInt(info.build);

                this.appVersionService.checkLatestVersion(platform as 'android' | 'ios').subscribe({
                    next: (res) => {
                        if (res.update_available && res.latest_version) {
                            const latestBuild = parseInt(res.latest_version.version_code);
                            if (latestBuild > currentBuild) {
                                this.updateAvailable.set({
                                    ...res.latest_version,
                                    download_url: `${this.api.phpBaseUrl}/app/download?platform=${platform}`
                                });
                            }
                        }
                    }
                });
            } catch (e) {
                console.error('Error checking for updates', e);
            }
        }
    }

    ngOnDestroy() {
        // Cleanup subscriptions if needed
    }

    async loadUsers() {
        this.isLoading.set(true);
        try {
            const params = {
                userId: this.currentUser?.id?.toString() || '0',
                limit: '50'
            };

            const users = await lastValueFrom(this.api.get('/users/random', params));

            // Normalize user data
            this.users = users.map((user: any) => {
                // Normalize avatar URL
                if (user.avatar && !user.avatar.startsWith('http')) {
                    user.avatar = `${this.api.phpBaseUrl}${user.avatar}`;
                }

                // Parse languages if they're strings
                if (typeof user.native_language === 'string') {
                    user.native_language = user.native_language.split(',').filter((l: string) => l.trim());
                }
                if (typeof user.learning_language === 'string') {
                    user.learning_language = user.learning_language.split(',').filter((l: string) => l.trim());
                }

                return user;
            });

            // Update statuses now that we have users
            this.updateUserStatuses();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            this.isLoading.set(false);
        }
    }

    updateUserStatuses() {
        const onlineUsers = this.socketService.onlineUsers();
        this.users.forEach(user => {
            user.isOnline = onlineUsers.has(Number(user.id)) || onlineUsers.has(String(user.id) as any);
        });
    }

    applyFilters() {
        this.filteredUsers = this.users.filter(user => {
            // Status filter
            if (this.filterStatus === 'online' && !user.isOnline) return false;
            if (this.filterStatus === 'offline' && user.isOnline) return false;

            // Gender filter
            if (this.filterGender !== 'any' && user.gender !== this.filterGender) return false;

            // Location filter
            if (this.filterLocation !== 'any' && user.location !== this.filterLocation) return false;

            // Native language filter
            if (this.filterNativeLanguage !== 'any') {
                const nativeLangs = Array.isArray(user.native_language) ? user.native_language : [user.native_language];
                if (!nativeLangs.includes(this.filterNativeLanguage)) return false;
            }

            // Learning language filter
            if (this.filterLearningLanguage !== 'any') {
                const learningLangs = Array.isArray(user.learning_language) ? user.learning_language : [user.learning_language];
                if (!learningLangs.includes(this.filterLearningLanguage)) return false;
            }

            return true;
        });
    }

    onFilterChange() {
        this.applyFilters();
    }

    toggleFilterPanel() {
        // Toggle using signal API
        const next = !this.showFilters();
        this.showFilters.set(next);
        console.log('showFilters toggled ->', next);
    }

    resetFilters() {
        this.filterStatus = 'any';
        this.filterGender = 'any';
        this.filterLocation = 'any';
        this.filterNativeLanguage = 'any';
        this.filterLearningLanguage = 'any';
        this.applyFilters();
    }

    getFlagIcon(location: string): string {
        return this.countryService.getFlagUrl(location);
    }

    async connectRandomly() {
        // Validation: Check if native_language, learning_language and interests exist
        const user = this.currentUser;

        const hasNative = !!user?.native_language && user.native_language !== '' && user.native_language !== 'any';
        const hasLearning = !!user?.learning_language && user.learning_language !== '' && user.learning_language !== 'any';
        const hasInterests = user?.interests && Array.isArray(user.interests) && user.interests.length > 0;

        console.log('Random Connect Validation:', { hasNative, hasLearning, hasInterests, user });

        if (!hasNative || !hasLearning || !hasInterests) {
            this.showValidationMessage.set(true);

            // Scroll to the top of the explore content where the message is
            const content = document.querySelector('.explore-content');
            if (content) {
                content.scrollTo({ top: 0, behavior: 'smooth' });
            }

            setTimeout(() => this.showValidationMessage.set(false), 8000);
            return;
        }

        this.isLoading.set(true);
        try {
            // Build filter params to send to smart-match endpoint
            const onlineSet = this.socketService.onlineUsers();
            // Exclude current user from online ids
            const onlineIds = Array.from(onlineSet).filter(id => Number(id) !== Number(this.currentUser?.id));

            const params: any = {
                userId: this.currentUser?.id || 0,
                gender: this.filterGender || 'any',
                location: this.filterLocation || 'any',
                native: this.filterNativeLanguage || '',
                learning: this.filterLearningLanguage || ''
            };
            if (onlineIds.length > 0) {
                params.online_ids = onlineIds.join(',');
            }

            const match = await lastValueFrom(this.api.get('/users/smart-match', params));
            if (match && match.id) {
                this.router.navigate(['/dashboard/chat', match.id]);
            } else {
                alert('No users found to connect with! Try again later.');
            }
        } catch (error) {
            console.error('Error connecting randomly:', error);
            // alert('Failed to connect randomly. Please try again.');
        } finally {
            this.isLoading.set(false);
        }
    }

    sendMessage(user: UserProfile, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        // Navigate to chat with this user
        this.router.navigate(['/dashboard/chat', user.id]);
    }

    downloadUpdate(event: Event) {
        event.preventDefault();
        const url = this.updateAvailable()?.download_url;
        if (url) {
            window.open(url, '_system');
        }
    }

    openProfile(user: UserProfile) {
        this.selectedUser = user;
    }


    closeProfile() {
        this.selectedUser = null;
    }

    getLanguageLabel(code: string): string {
        return this.countryService.getLanguageName(code);
    }

    getLocationLabel(code: string): string {
        return this.countryService.getCountryName(code);
    }

    getLanguagesDisplay(languages: string | string[]): string {
        if (!languages) return '';
        const langArray = Array.isArray(languages) ? languages : [languages];
        return langArray.map(l => this.getLanguageLabel(l)).join(', ');
    }

    getLanguagesArray(languages: string | string[]): string[] {
        if (!languages) return [];
        return Array.isArray(languages) ? languages : [languages];
    }

    getLanguageFlagUrl(langCode: string): string {
        return this.countryService.getLanguageFlagUrl(langCode);
    }

    getAvatarColor(name: string): string {
        const colors = [
            'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
            'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    getInitials(name: string): string {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    trackByUserId(index: number, user: UserProfile): number {
        return user.id;
    }

    trackByInterestId(index: number, interest: any): number {
        return interest.id;
    }

    trackByLanguage(index: number, lang: string): string {
        return lang;
    }

    formatLastActive(lastActive: string | number | undefined): string {
        if (!lastActive) return '';

        try {
            let ts: number;
            if (typeof lastActive === 'number') {
                // assume seconds
                ts = lastActive < 10000000000 ? lastActive * 1000 : lastActive;
            } else if (/^\d+$/.test(String(lastActive))) {
                // numeric string -> seconds
                const num = parseInt(String(lastActive), 10);
                ts = num < 10000000000 ? num * 1000 : num;
            } else {
                ts = new Date(String(lastActive)).getTime();
            }

            const lastActiveDate = new Date(ts);
            if (isNaN(lastActiveDate.getTime())) {
                return 'Invalid Date';
            }

            const now = new Date();
            const diffMs = now.getTime() - lastActiveDate.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) {
                return 'Just now';
            } else if (diffMins < 60) {
                return `${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return lastActiveDate.toLocaleDateString();
            }
        } catch (e) {
            return 'Invalid Date';
        }
    }
}
