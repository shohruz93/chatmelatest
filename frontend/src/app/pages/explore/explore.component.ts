
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
import { ProfileCompletionModalComponent } from '../../components/profile-completion-modal/profile-completion-modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CommunityFeedComponent } from '../../components/community-feed/community-feed.component';
import { AppVersionService } from '../../services/app-version.service';
import { GamificationService } from '../../services/gamification.service';
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
    rating?: number;
    rating_count?: number;
}

@Component({
    selector: 'app-explore',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, CommunityFeedComponent, UserProfileModalComponent, ProfileCompletionModalComponent],
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
    private gamificationService = inject(GamificationService);

    users: UserProfile[] = [];
    filteredUsers: UserProfile[] = [];
    currentUser: any;
    isLoading = signal(false);
    isLoadingMore = signal(false);
    selectedUser: UserProfile | null = null;
    totalUsers = signal(0);
    updateAvailable = signal<any>(null);

    // Pagination state
    currentOffset: number = 0;
    hasMoreUsers: boolean = true;

    // Tab Navigation
    activeTab: 'users' | 'community' = 'users';

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
    showProfileCompletionModal = signal(false);

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

        // Check if user needs to complete profile (missing gender or languages)
        const needsProfileCompletion = this.needsProfileCompletion();
        if (needsProfileCompletion) {
            this.showProfileCompletionModal.set(true);
        } else if (this.hasIncompleteProfile()) {
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

        // Track explore page visit as a daily login mission
        this.gamificationService.trackMission('login');
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
    }

    async loadUsers() {
        this.isLoading.set(true);
        this.currentOffset = 0;
        this.hasMoreUsers = true;
        try {
            const params: any = {
                userId: this.currentUser?.id?.toString() || '0',
                limit: '40',
                offset: '0'
            };

            // Add server-side filters
            if (this.filterGender !== 'any') {
                params.gender = this.filterGender;
            }
            if (this.filterLocation !== 'any') {
                params.location = this.filterLocation;
            }

            // Pass language preferences for smarter matching
            if (this.currentUser?.native_language) {
                const native = this.extractFirstLanguage(this.currentUser.native_language);
                if (native) params.native_language = native;
            }
            if (this.currentUser?.learning_language) {
                const learning = this.extractFirstLanguage(this.currentUser.learning_language);
                if (learning) params.learning_language = learning;
            }

            const response: any = await lastValueFrom(this.api.get('/users/random', params));
            let newUsers: UserProfile[] = [];

            if (response && response.users) {
                newUsers = response.users;
                // Only update total users if we are on the first page or it's explicitly returned
                this.totalUsers.set(response.total_count || 0);
            } else if (Array.isArray(response)) {
                // Fallback if backend hasn't updated or returns array
                newUsers = response;
                this.totalUsers.set(newUsers.length);
            }

            // If we got fewer users than the limit, we've reached the end
            if (newUsers.length < 40) {
                this.hasMoreUsers = false;
            }

            // Normalize user data
            this.users = newUsers.map((user: any) => {
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

            this.currentOffset = 40;

            // Update statuses now that we have users
            this.updateUserStatuses();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            this.isLoading.set(false);
        }
    }

    async loadMoreUsers() {
        if (!this.hasMoreUsers || this.isLoadingMore()) {
            return;
        }

        this.isLoadingMore.set(true);
        try {
            const params: any = {
                userId: this.currentUser?.id?.toString() || '0',
                limit: '40',
                offset: this.currentOffset.toString()
            };

            // Add server-side filters
            if (this.filterGender !== 'any') {
                params.gender = this.filterGender;
            }
            if (this.filterLocation !== 'any') {
                params.location = this.filterLocation;
            }

            // Pass language preferences for smarter matching
            if (this.currentUser?.native_language) {
                const native = this.extractFirstLanguage(this.currentUser.native_language);
                if (native) params.native_language = native;
            }
            if (this.currentUser?.learning_language) {
                const learning = this.extractFirstLanguage(this.currentUser.learning_language);
                if (learning) params.learning_language = learning;
            }

            const response: any = await lastValueFrom(this.api.get('/users/random', params));
            let newUsers: UserProfile[] = [];

            if (response && response.users) {
                newUsers = response.users;
                // Update total count if it changed
                if (response.total_count) this.totalUsers.set(response.total_count);
            } else if (Array.isArray(response)) {
                newUsers = response;
            }

            // If we got fewer users than the limit, we've reached the end
            if (newUsers.length < 40) {
                this.hasMoreUsers = false;
            }

            // Normalize user data
            const normalizedUsers = newUsers.map((user: any) => {
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

            // Append to existing users
            this.users = [...this.users, ...normalizedUsers];
            this.currentOffset += normalizedUsers.length;

            // Update statuses and reapply filters
            this.updateUserStatuses();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading more users:', error);
        } finally {
            this.isLoadingMore.set(false);
        }
    }



    updateUserStatuses() {
        const onlineUsers = this.socketService.onlineUsers();
        this.users.forEach(user => {
            user.isOnline = onlineUsers.has(Number(user.id)) || onlineUsers.has(String(user.id) as any);
        });
    }

    applyFilters() {
        const filtered = this.users.filter(user => {
            // Status filter
            if (this.filterStatus === 'online' && !user.isOnline) return false;
            if (this.filterStatus === 'offline' && user.isOnline) return false;

            // Gender filter
            if (this.filterGender !== 'any' && user.gender !== this.filterGender) return false;

            // Location filter
            if (this.filterLocation !== 'any' && user.location !== this.filterLocation) return false;

            // Native language filter
            if (this.filterNativeLanguage !== 'any') {
                const nativeLangs = this.getLanguagesArray(user.native_language);
                if (!nativeLangs.includes(this.filterNativeLanguage)) return false;
            }

            // Learning language filter
            if (this.filterLearningLanguage !== 'any') {
                const learningLangs = this.getLanguagesArray(user.learning_language);
                if (!learningLangs.includes(this.filterLearningLanguage)) return false;
            }

            return true;
        });

        this.filteredUsers = this.sortUsers(filtered);
    }

    sortUsers(users: UserProfile[]): UserProfile[] {
        if (!this.currentUser) return users;

        return [...users].sort((a, b) => {
            // 1. Show online users first
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;

            // 2. Then match by learning languages
            const myLearning = this.getLanguagesArray(this.currentUser.learning_language);
            if (myLearning.length > 0) {
                const aNative = this.getLanguagesArray(a.native_language);
                const bNative = this.getLanguagesArray(b.native_language);
                const aMatch = aNative.some(l => myLearning.includes(l));
                const bMatch = bNative.some(l => myLearning.includes(l));
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
            }

            // 3. Then by rating
            const aRating = a.rating || 0;
            const bRating = b.rating || 0;
            if (aRating !== bRating) return bRating - aRating;

            // 4. Then by last_active
            const aTime = this.getTimestamp(a.last_active);
            const bTime = this.getTimestamp(b.last_active);
            return bTime - aTime;
        });
    }

    private getTimestamp(lastActive: any): number {
        if (!lastActive) return 0;
        if (typeof lastActive === 'number') {
            return lastActive < 10000000000 ? lastActive * 1000 : lastActive;
        }
        if (/^\d+$/.test(String(lastActive))) {
            const num = parseInt(String(lastActive), 10);
            return num < 10000000000 ? num * 1000 : num;
        }
        return new Date(String(lastActive)).getTime() || 0;
    }

    shuffleArray(array: any[]): any[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    onFilterChange() {
        // Reset pagination when filters change
        this.currentOffset = 0;
        this.users = [];
        this.hasMoreUsers = true;
        this.loadUsers();
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
        this.onFilterChange();
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

    extractFirstLanguage(languages: string | string[]): string {
        if (!languages) return '';
        const langArray = Array.isArray(languages) ? languages : [languages];
        return langArray.length > 0 ? langArray[0] : '';
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

    needsProfileCompletion(): boolean {
        if (!this.currentUser) return false;
        const hasGender = !!this.currentUser?.gender && this.currentUser.gender !== '';
        const hasNative = !!this.currentUser?.native_language &&
            this.currentUser.native_language !== '' &&
            this.currentUser.native_language !== 'any';
        const hasLearning = !!this.currentUser?.learning_language &&
            this.currentUser.learning_language !== '' &&
            this.currentUser.learning_language !== 'any';
        return !hasGender || !hasNative || !hasLearning;
    }

    onProfileCompleted() {
        this.showProfileCompletionModal.set(false);
        // Refresh current user data
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
        }
        // Reload users with updated profile
        this.loadUsers();
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
                return `${diffMins}m`;
            } else if (diffHours < 24) {
                return `${diffHours}h`;
            } else if (diffDays < 7) {
                return `${diffDays}d`;
            } else {
                return lastActiveDate.toLocaleDateString();
            }
        } catch (e) {
            return '';
        }
    }
}
