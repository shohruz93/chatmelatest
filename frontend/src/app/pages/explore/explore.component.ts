import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';

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
    interests?: { id: number; name: string }[];
}

@Component({
    selector: 'app-explore',
    standalone: true,
    imports: [CommonModule, FormsModule, UserProfileModalComponent],
    templateUrl: './explore.component.html',
    styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private socketService = inject(SocketService);
    private auth = inject(AuthService);
    private api = inject(ApiService);

    users: UserProfile[] = [];
    filteredUsers: UserProfile[] = [];
    currentUser: any;
    isLoading = signal(false);
    selectedUser: UserProfile | null = null;

    // Filters
    filterStatus: string = 'any';
    filterGender: string = 'any';
    filterLocation: string = 'any';
    filterNativeLanguage: string = 'any';
    filterLearningLanguage: string = 'any';

    statusOptions = [
        { value: 'any', label: 'Any Status' },
        { value: 'online', label: 'Online Only' },
        { value: 'offline', label: 'Offline' }
    ];

    genderOptions = [
        { value: 'any', label: 'Any Gender' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' }
    ];

    locationOptions = [
        { value: 'any', label: 'Any Location' },
        { value: 'US', label: 'United States' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'RU', label: 'Russia' },
        { value: 'TJ', label: 'Tajikistan' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'TR', label: 'Turkey' },
        { value: 'CN', label: 'China' },
        { value: 'JP', label: 'Japan' },
        { value: 'KR', label: 'South Korea' },
        { value: 'IN', label: 'India' },
        { value: 'BR', label: 'Brazil' },
        { value: 'MX', label: 'Mexico' },
        { value: 'ES', label: 'Spain' },
        { value: 'IT', label: 'Italy' },
        { value: 'CA', label: 'Canada' },
        { value: 'AU', label: 'Australia' }
    ];

    languageOptions = [
        { value: 'any', label: 'Any Language' },
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'ru', label: 'Russian' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ja', label: 'Japanese' },
        { value: 'ko', label: 'Korean' },
        { value: 'ar', label: 'Arabic' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'hi', label: 'Hindi' },
        { value: 'tg', label: 'Tajik' },
        { value: 'tr', label: 'Turkish' },
        { value: 'it', label: 'Italian' }
    ];

    // Expose Array to template
    Array = Array;

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

    ngOnInit() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
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

    resetFilters() {
        this.filterStatus = 'any';
        this.filterGender = 'any';
        this.filterLocation = 'any';
        this.filterNativeLanguage = 'any';
        this.filterLearningLanguage = 'any';
        this.applyFilters();
    }

    // Map country names to ISO 2-letter codes
    private countryNameToCode: { [key: string]: string } = {
        'united states': 'us',
        'united kingdom': 'gb',
        'russia': 'ru',
        'tajikistan': 'tj',
        'germany': 'de',
        'france': 'fr',
        'turkey': 'tr',
        'china': 'cn',
        'japan': 'jp',
        'south korea': 'kr',
        'korea': 'kr',
        'india': 'in',
        'brazil': 'br',
        'mexico': 'mx',
        'spain': 'es',
        'italy': 'it',
        'canada': 'ca',
        'australia': 'au',
        'switzerland': 'ch',
        'netherlands': 'nl',
        'belgium': 'be',
        'sweden': 'se',
        'norway': 'no',
        'denmark': 'dk',
        'finland': 'fi',
        'poland': 'pl',
        'portugal': 'pt',
        'greece': 'gr',
        'austria': 'at',
        'czech republic': 'cz',
        'ireland': 'ie',
        'new zealand': 'nz',
        'singapore': 'sg',
        'malaysia': 'my',
        'thailand': 'th',
        'vietnam': 'vn',
        'philippines': 'ph',
        'indonesia': 'id',
        'pakistan': 'pk',
        'bangladesh': 'bd',
        'egypt': 'eg',
        'south africa': 'za',
        'nigeria': 'ng',
        'kenya': 'ke',
        'argentina': 'ar',
        'chile': 'cl',
        'colombia': 'co',
        'peru': 'pe',
        'venezuela': 've',
        'ukraine': 'ua',
        'romania': 'ro',
        'hungary': 'hu',
        'israel': 'il',
        'saudi arabia': 'sa',
        'uae': 'ae',
        'united arab emirates': 'ae'
    };

    getFlagIcon(location: string): string {
        if (!location) return '';

        // Convert to lowercase for comparison
        const locationLower = location.toLowerCase().trim();

        // Check if it's already a 2-letter code
        if (locationLower.length === 2) {
            return `/flags/${locationLower}.png`;
        }

        // Try to map country name to code
        const code = this.countryNameToCode[locationLower];
        if (code) {
            return `/flags/${code}.png`;
        }

        // Fallback: use the location as-is (might be a code already)
        return `/flags/${locationLower}.png`;
    }

    sendMessage(user: UserProfile, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        // Navigate to chat with this user
        this.router.navigate(['/dashboard/chat', user.id]);
    }

    openProfile(user: UserProfile) {
        this.selectedUser = user;
    }

    closeProfile() {
        this.selectedUser = null;
    }

    getLanguageLabel(code: string): string {
        const lang = this.languageOptions.find(l => l.value === code);
        return lang ? lang.label : code;
    }

    getLocationLabel(code: string): string {
        const loc = this.locationOptions.find(l => l.value === code);
        return loc ? loc.label : code;
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

    // Map language codes to country codes for flags
    private languageToCountry: { [key: string]: string } = {
        'en': 'gb',
        'es': 'es',
        'fr': 'fr',
        'de': 'de',
        'ru': 'ru',
        'zh': 'cn',
        'ja': 'jp',
        'ko': 'kr',
        'ar': 'sa',
        'pt': 'pt',
        'hi': 'in',
        'tg': 'tj',
        'tr': 'tr',
        'it': 'it'
    };

    getLanguageFlagUrl(langCode: string): string {
        if (!langCode) return '';
        const countryCode = this.languageToCountry[langCode.toLowerCase()] || langCode.toLowerCase();
        return `/flags/${countryCode}.png`;
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
}
