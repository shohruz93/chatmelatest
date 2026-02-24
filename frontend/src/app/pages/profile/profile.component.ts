import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CountryService } from '../../services/country.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { AppVersionService } from '../../services/app-version.service';
import { CountrySelectComponent } from '../../components/country-select/country-select.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UnixDatePipe } from '../../pipes/unix-date.pipe';
import { interval, Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OnDestroy } from '@angular/core';

import { TelegramService } from '../../services/telegram.service';
import { GamificationService } from '../../services/gamification.service';
import { WalletComponent } from '../../components/gamification/wallet/wallet.component';
import { MissionsComponent } from '../../components/gamification/missions/missions.component';
import { GalleryService, GalleryImage } from '../../services/gallery.service';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent, RouterLink, CountrySelectComponent, TranslatePipe, UnixDatePipe, WalletComponent, MissionsComponent],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private countryService = inject(CountryService);
    private telegramService = inject(TelegramService);
    private gameService = inject(GamificationService);
    private galleryService = inject(GalleryService);
    private languageService = inject(LanguageService);

    private appVersionService = inject(AppVersionService);

    private destroy$ = new Subject<void>();
    private telegramPollSubscription: Subscription | null = null;

    isWeb = false;
    downloadUrls: { android: string | null; ios: string | null } = { android: null, ios: null };

    currentUser: any; // The logged-in user
    profileUser: any; // The user whose profile is being viewed

    bio: string = '';
    userName: string = '';
    interests: string[] = []; // Now stores keys like ['TRAVEL', 'READING']
    ratings: any = { average: 0, count: 0 };
    comments: any[] = [];
    loading: boolean = false;
    isEditing: boolean = false;
    isOwnProfile: boolean = false;

    selectedFile: File | null = null;
    previewUrl: string | null = null;
    newInterest: string = '';
    showLogoutDialog: boolean = false;

    gender: string = '';
    location: string = '';
    nativeLanguages: string[] = [];
    learningLanguages: string[] = [];

    // Bio character limit
    bioMaxLength: number = 500;

    // Telegram Integration
    telegramConnected: boolean = false;
    telegramUsername: string = '';
    telegramNotificationsEnabled: boolean = true;
    telegramLoading: boolean = false;
    telegramConnectionCode: string = '';
    telegramDeepLink: string = '';
    showTelegramConnect: boolean = false;
    telegramBotName: string = '';
    telegramPollingActive: boolean = false;

    // Rating & Comment Inputs
    newRating: number = 0;
    newComment: string = '';
    isSubmitting: boolean = false;
    replyContent: { [key: number]: string } = {};
    showReplyInput: { [key: number]: boolean } = {};
    showReplies: { [key: number]: boolean } = {};
    hasRated: boolean = false;

    // Tab Navigation
    activeTab: 'missions' | 'rates' | 'gallery' = 'missions';

    // Gallery
    galleryImages: GalleryImage[] = [];
    showUploadModal: boolean = false;
    showViewModal: boolean = false;
    viewingImage: GalleryImage | null = null;
    uploadFile: File | null = null;
    uploadPreview: string | null = null;
    uploadCaption: string = '';
    galleryLoading: boolean = false;
    uploadPercent: number = 0;

    // Unique ID Search
    searchUniqueId: string = '';
    searchError: string = '';
    searchLoading: boolean = false;

    genderOptions = [
        { value: '', label: 'Prefer not to say' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
    ];

    // Predefined interests list
    // Available interests with keys and icons
    availableInterests = [
        { key: 'TRAVEL', icon: '✈️' },
        { key: 'READING', icon: '📚' },
        { key: 'SPORTS', icon: '⚽' },
        { key: 'MUSIC', icon: '🎵' },
        { key: 'MOVIES', icon: '🎬' },
        { key: 'COOKING', icon: '🍳' },
        { key: 'PHOTOGRAPHY', icon: '📷' },
        { key: 'GAMING', icon: '🎮' },
        { key: 'ART', icon: '🎨' },
        { key: 'TECHNOLOGY', icon: '💻' },
        { key: 'FITNESS', icon: '💪' },
        { key: 'NATURE', icon: '🌿' },
        { key: 'FASHION', icon: '👗' },
        { key: 'WRITING', icon: '✍️' },
        { key: 'DANCING', icon: '💃' },
        { key: 'LEARNING_LANGUAGES', icon: '🗣️' },
        { key: 'VOLUNTEERING', icon: '🤝' },
        { key: 'MEDITATION', icon: '🧘' },
        { key: 'PETS', icon: '🐾' },
        { key: 'FOOD', icon: '🍕' }
    ];

    // Legacy interest name to key mapping for backward compatibility
    private legacyInterestMapping: { [key: string]: string } = {
        'Travel': 'TRAVEL',
        'Traveling': 'TRAVEL',
        'Reading': 'READING',
        'Sports': 'SPORTS',
        'Music': 'MUSIC',
        'Movies': 'MOVIES',
        'Cooking': 'COOKING',
        'Photography': 'PHOTOGRAPHY',
        'Gaming': 'GAMING',
        'Game': 'GAMING',
        'Games': 'GAMING',
        'Art': 'ART',
        'Technology': 'TECHNOLOGY',
        'Tech': 'TECHNOLOGY',
        'Coding': 'TECHNOLOGY',
        'Programming': 'TECHNOLOGY',
        'Fitness': 'FITNESS',
        'Nature': 'NATURE',
        'Fashion': 'FASHION',
        'Writing': 'WRITING',
        'Dancing': 'DANCING',
        'Dance': 'DANCING',
        'Learning Languages': 'LEARNING_LANGUAGES',
        'Languages': 'LEARNING_LANGUAGES',
        'Volunteering': 'VOLUNTEERING',
        'Volunteer': 'VOLUNTEERING',
        'Meditation': 'MEDITATION',
        'Pets': 'PETS',
        'Food': 'FOOD',
        'Watch Movies': 'MOVIES',
        'Cinema': 'MOVIES',
        'Books': 'READING',
        'Read': 'READING',
        'Reading Books': 'READING'
    };

    // Simplified language list using CountryService
    get languageOptions() {
        return this.countryService.getLanguageOptions(false);
    }

    countries: { name: string, code: string, flag: string }[] = [];

    isDarkMode = signal(false);

    ngOnInit() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.isDarkMode.set(savedTheme === 'dark');

        try {
            this.isWeb = !Capacitor.isNativePlatform();
        } catch (e) {
            this.isWeb = true;
        }

        if (this.isWeb) {
            this.appVersionService.checkLatestVersion('android').subscribe(res => {
                if (res && res.latest_version) {
                    this.downloadUrls.android = `${environment.phpBaseUrl}/app/download?platform=android`;
                }
            });
            this.appVersionService.checkLatestVersion('ios').subscribe(res => {
                if (res && res.latest_version) {
                    this.downloadUrls.ios = `${environment.phpBaseUrl}/app/download?platform=ios`;
                }
            });
        }

        this.currentUser = this.auth.currentUserValue;

        this.route.params.subscribe(params => {
            const userId = params['id'] ? +params['id'] : this.currentUser?.id;

            if (userId) {
                this.isOwnProfile = (userId === this.currentUser?.id);
                this.loadProfile(userId);

                if (!this.isOwnProfile && this.currentUser) {
                    this.api.recordView(this.currentUser.id, userId).subscribe();
                } else if (this.isOwnProfile) {
                    this.checkTelegramStatus();

                    // Check for edit query parameter
                    this.route.queryParams.subscribe(queryParams => {
                        if (queryParams['edit'] === 'true') {
                            this.isEditing = true;
                        }
                    });
                }
            }
        });
    }

    loadProfile(userId: number) {
        this.loading = true;
        this.api.get(`/profile?userId=${userId}`).subscribe({
            next: (data) => {
                this.profileUser = { ...data }; // Create a copy
                this.bio = data.bio || '';
                this.userName = data.name || '';
                // Convert interests from objects to keys with legacy support
                if (data.interests && Array.isArray(data.interests)) {
                    this.interests = data.interests.map((i: any) => {
                        // Extract name from object or use string directly
                        let name = typeof i === 'string' ? i : (i.name || i.key || '');
                        // Check if it's already a valid key (all uppercase)
                        if (name === name.toUpperCase() && this.availableInterests.some(ai => ai.key === name)) {
                            return name;
                        }
                        // Try to map legacy name to key
                        return this.legacyInterestMapping[name] || name.toUpperCase().replace(/ /g, '_');
                    }).filter((k: string) => k && this.availableInterests.some(ai => ai.key === k));
                } else {
                    this.interests = [];
                }
                this.gender = data.gender || '';
                this.location = data.location || '';

                this.nativeLanguages = data.native_language ? data.native_language.split(',') : [];
                this.learningLanguages = data.learning_language ? data.learning_language.split(',') : [];

                if (data.avatar) {
                    if (data.avatar.startsWith('http')) {
                        this.profileUser.avatar = data.avatar;
                    } else {
                        this.profileUser.avatar = `${this.api.phpBaseUrl}${data.avatar}`;
                    }
                }

                this.ratings = {
                    average: data.rating || 0,
                    count: data.rating_count || 0
                };

                this.loadComments(userId);
                this.loading = false;

                if (this.isOwnProfile) {
                    this.gameService.setWalletState(data.coins, data.xp);
                }
            },
            error: (err) => {
                console.error('Error loading profile', err);
                this.loading = false;
            }
        });
    }

    loadComments(userId: number) {
        this.api.getComments(userId).subscribe({
            next: (data) => {
                this.comments = data;
                this.comments.map(comment => {
                    comment.rater_avatar = `${this.api.phpBaseUrl}${comment.rater_avatar}`;
                    comment.replies?.map((reply: any) => {
                        reply.replier_avatar = `${this.api.phpBaseUrl}${reply.replier_avatar}`;
                        return reply;
                    })
                })

                // Check if current user has already rated this profile
                if (this.currentUser) {

                    this.hasRated = this.comments.some(
                        c => c.rater_id === this.currentUser.id && c.rating !== null && c.rating > 0
                    );
                }
            },
            error: (err) => console.error('Error loading comments', err)
        });
    }

    toggleEdit() {
        if (!this.isOwnProfile) return;
        this.isEditing = !this.isEditing;
        if (!this.isEditing) {
            this.loadProfile(this.currentUser.id);
            this.selectedFile = null;
            this.previewUrl = null;
            this.newInterest = '';
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.previewUrl = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file');
        }
    }

    addInterest() {
        // This method is no longer used with selectable chips
        // Keeping for backwards compatibility
        const trimmed = this.newInterest.trim();
        if (trimmed && !this.interests.includes(trimmed)) {
            this.interests.push(trimmed);
            this.newInterest = '';
        }
    }

    toggleInterest(interest: { key: string, icon: string }) {
        const index = this.interests.indexOf(interest.key);
        if (index > -1) {
            this.interests.splice(index, 1);
        } else {
            this.interests.push(interest.key);
        }
    }

    isInterestSelected(interest: { key: string, icon: string }): boolean {
        return this.interests.includes(interest.key);
    }

    getInterestIcon(key: string): string {
        return this.availableInterests.find(i => i.key === key)?.icon || '🏷️';
    }

    removeInterest(index: number) {
        this.interests.splice(index, 1);
    }

    addLanguage(type: 'native' | 'learning', event: any) {
        const code = event.target.value;
        if (!code) return;

        const targetArray = type === 'native' ? this.nativeLanguages : this.learningLanguages;

        if (!targetArray.includes(code)) {
            targetArray.push(code);
        }
        event.target.value = '';
    }

    removeLanguage(type: 'native' | 'learning', code: string) {
        const targetArray = type === 'native' ? this.nativeLanguages : this.learningLanguages;
        const index = targetArray.indexOf(code);
        if (index > -1) {
            targetArray.splice(index, 1);
        }
    }

    getLanguageName(code: string): string {
        return this.countryService.getLanguageName(code);
    }

    getLanguageFlag(code: string): string {
        return this.countryService.getLanguageFlagUrl(code);
    }

    saveProfile() {
        this.loading = true;
        const formData = new FormData();
        formData.append('name', this.userName);
        formData.append('bio', this.bio);
        formData.append('gender', this.gender);
        formData.append('location', this.location);
        formData.append('native_language', this.nativeLanguages.join(','));
        formData.append('learning_language', this.learningLanguages.join(','));

        this.interests.forEach((interest, index) => {
            // Now interests are just string keys like 'TRAVEL', 'READING'
            formData.append(`interests[${index}]`, interest);
        });

        if (this.selectedFile) {
            formData.append('avatar', this.selectedFile);
        }

        this.api.post(`/profile?userId=${this.currentUser.id}`, formData).subscribe({
            next: (res: any) => {
                this.isEditing = false;
                this.selectedFile = null;
                this.previewUrl = null;

                let avatarUrl = this.currentUser.avatar;
                if (res.avatar) {
                    avatarUrl = this.api.phpBaseUrl + res.avatar;
                    this.currentUser.avatar = avatarUrl;
                }

                // Update auth service to persist ALL changes in localStorage
                const updatedUser = {
                    ...this.currentUser,
                    name: this.userName,
                    bio: this.bio,
                    gender: this.gender,
                    location: this.location,
                    native_language: this.nativeLanguages.join(','),
                    learning_language: this.learningLanguages.join(','),
                    interests: this.interests,
                    avatar: avatarUrl
                };

                this.auth.updateUser(updatedUser);

                this.loadProfile(this.currentUser.id);
                alert('Profile updated successfully!');
            },
            error: (err) => {
                console.error('Error updating profile', err);
                this.loading = false;
                alert('Failed to save profile. Please try again.');
            }
        });
    }

    // Comments & Ratings Logic
    setRating(stars: number) {
        this.newRating = stars;
    }

    submitRating() {
        if (this.newRating === 0) {
            alert('Please select a rating');
            return;
        }

        if (this.newComment.length > 250) {
            alert('Comment cannot exceed 250 characters');
            return;
        }

        this.isSubmitting = true;

        const data = {
            raterId: this.currentUser.id,
            ratedId: this.profileUser.id,
            rating: this.newRating,
            comment: this.newComment
        };

        this.api.post('/profile/rating', data).subscribe({
            next: () => {
                this.newRating = 0;
                this.newComment = '';
                this.isSubmitting = false;
                this.loadProfile(this.profileUser.id); // Reload to get new stats and comments
            },
            error: (err) => {
                this.isSubmitting = false;
                alert('Failed to submit rating');
            }
        });
    }

    submitComment() {
        if (!this.newComment.trim()) {
            alert('Please enter a comment');
            return;
        }

        if (this.newComment.length > 250) {
            alert('Comment cannot exceed 250 characters');
            return;
        }

        this.isSubmitting = true;

        this.api.addComment(this.currentUser.id, this.profileUser.id, this.newComment).subscribe({
            next: () => {
                this.newComment = '';
                this.isSubmitting = false;
                this.loadComments(this.profileUser.id);
            },
            error: (err) => {
                this.isSubmitting = false;
                alert('Failed to submit comment');
            }
        });
    }

    toggleReply(commentId: number) {
        this.showReplyInput[commentId] = !this.showReplyInput[commentId];
    }

    toggleReplies(commentId: number) {
        this.showReplies[commentId] = !this.showReplies[commentId];
    }

    get displayedComments() {
        return this.comments.slice(0, 10);
    }

    get hasMoreComments() {
        return this.comments.length > 10;
    }

    submitReply(commentId: number) {
        const content = this.replyContent[commentId];
        if (!content?.trim()) return;

        this.api.addReply(commentId, this.currentUser.id, content).subscribe({
            next: () => {
                this.replyContent[commentId] = '';
                this.showReplyInput[commentId] = false;
                this.loadComments(this.profileUser.id);
            },
            error: (err) => alert('Failed to reply')
        });
    }

    likeComment(commentId: number, type: 'like' | 'dislike') {
        this.api.likeComment(commentId, this.currentUser.id, type).subscribe({
            next: () => {
                this.loadComments(this.profileUser.id);
            },
            error: (err) => console.error('Failed to like/dislike', err)
        });
    }

    logout() {
        this.showLogoutDialog = true;
    }

    confirmLogout() {
        this.showLogoutDialog = false;
        this.auth.logout();
        this.router.navigate(['/']);
    }

    cancelLogout() {
        this.showLogoutDialog = false;
    }

    toggleTheme() {
        const newTheme = this.isDarkMode() ? 'light' : 'dark';
        this.isDarkMode.set(!this.isDarkMode());
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    getCountryFlagUrl(countryName: string): string {
        return this.countryService.getFlagUrl(countryName);
    }

    getGenderIcon(gender: string): string {
        const icons: { [key: string]: string } = {
            'male': '👨',
            'female': '👩',
            'other': '🧑',
            '': ''
        };
        return icons[gender.toLowerCase()] || '';
    }

    getLanguageFlagUrl(languageCode: string): string {
        return this.countryService.getLanguageFlagUrl(languageCode);
    }

    sendMessage() {
        if (this.profileUser && this.profileUser.id) {
            this.router.navigate(['/dashboard', 'chat', this.profileUser.id]);
        }
    }

    copyCode(code: string) {
        navigator.clipboard.writeText('/start ' + code).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code', err);
        });
    }

    copyUniqueId(code: string) {
        navigator.clipboard.writeText(code).then(() => {
            alert('Unique ID copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code', err);
        });
    }

    searchUserByUniqueId() {
        if (!this.searchUniqueId.trim()) return;
        this.searchLoading = true;
        this.searchError = '';
        this.api.searchByUniqueId(this.searchUniqueId.trim()).subscribe({
            next: (data) => {
                this.searchLoading = false;
                this.searchError = '';
                this.searchUniqueId = '';
                this.router.navigate(['/profile', data.id]);
            },
            error: (err) => {
                this.searchLoading = false;
                this.searchError = 'User not found';
            }
        });
    }

    // Telegram Methods
    checkTelegramStatus() {
        if (!this.currentUser?.id) return;

        this.telegramLoading = true;
        this.telegramService.getStatus(this.currentUser.id).subscribe({
            next: (status) => {
                this.telegramConnected = status.connected;
                this.telegramUsername = status.telegramUsername || '';
                this.telegramNotificationsEnabled = status.notificationsEnabled || false;
                this.telegramLoading = false;
            },
            error: (err) => {
                console.error('Failed to check Telegram status', err);
                this.telegramLoading = false;
            }
        });
    }

    generateTelegramCode() {
        this.telegramLoading = true;

        this.telegramService.generateCode(this.currentUser.id).subscribe({
            next: (res) => {
                if (res.success) {
                    this.telegramConnectionCode = res.code;
                    this.telegramDeepLink = res.deepLink;
                    this.telegramBotName = res.botUsername;
                    this.showTelegramConnect = true;

                    this.startTelegramPolling();
                }
                this.telegramLoading = false;
            },
            error: (err) => {
                console.error('Failed to generate code', err);
                alert('Failed to generate connection code. Please try again.');
                this.telegramLoading = false;
            }
        });
    }

    private startTelegramPolling() {
        if (this.telegramPollingActive) return;

        this.telegramPollingActive = true;
        let pollCount = 0;
        const maxPolls = 60;

        this.telegramPollSubscription = interval(2000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                pollCount++;

                if (pollCount > maxPolls) {
                    this.stopTelegramPolling();
                    return;
                }

                this.telegramService.getStatus(this.currentUser.id).subscribe({
                    next: (status) => {
                        if (status.connected) {
                            this.telegramConnected = status.connected;
                            this.telegramUsername = status.telegramUsername || '';
                            this.telegramNotificationsEnabled = status.notificationsEnabled || false;
                            this.showTelegramConnect = false;
                            this.stopTelegramPolling();
                        }
                    },
                    error: (err) => {
                        console.error('Error polling Telegram status', err);
                    }
                });
            });
    }

    private stopTelegramPolling() {
        if (this.telegramPollSubscription) {
            this.telegramPollSubscription.unsubscribe();
            this.telegramPollSubscription = null;
        }
        this.telegramPollingActive = false;
    }

    toggleTelegramConnectModal() {
        if (this.showTelegramConnect) {
            this.showTelegramConnect = false;
            this.stopTelegramPolling();
            this.checkTelegramStatus();
        } else {
            this.generateTelegramCode();
        }
    }

    disconnectTelegram() {
        if (!confirm('Are you sure you want to disconnect Telegram notifications?')) return;

        this.telegramLoading = true;
        this.telegramService.disconnect(this.currentUser.id).subscribe({
            next: (res) => {
                this.telegramConnected = false;
                this.telegramUsername = '';
                this.telegramNotificationsEnabled = false;
                this.telegramLoading = false;
                alert('Telegram disconnected successfully.');
            },
            error: (err) => {
                console.error('Failed to disconnect Telegram', err);
                alert('Failed to disconnect Telegram.');
                this.telegramLoading = false;
            }
        });
    }

    toggleTelegramNotifications() {
        // Optimistic update
        const newState = !this.telegramNotificationsEnabled;
        this.telegramNotificationsEnabled = newState;

        this.telegramService.toggleNotifications(this.currentUser.id, newState).subscribe({
            error: (err) => {
                // Revert on error
                this.telegramNotificationsEnabled = !newState;
                console.error('Failed to toggle notifications', err);
                alert('Failed to update notification settings.');
            }
        });
    }

    // Tab Navigation
    setActiveTab(tab: 'missions' | 'rates' | 'gallery') {
        this.activeTab = tab;
        if (tab === 'gallery' && this.galleryImages.length === 0) {
            this.loadGallery();
        }
    }

    // Gallery Methods
    loadGallery() {
        if (!this.profileUser?.id) return;
        this.galleryLoading = true;
        this.galleryService.getGallery(this.profileUser.id, this.currentUser?.id).subscribe({
            next: (images) => {
                this.galleryImages = images;
                this.galleryLoading = false;
            },
            error: (err) => {
                console.error('Failed to load gallery', err);
                this.galleryLoading = false;
            }
        });
    }

    openUploadModal() {
        this.showUploadModal = true;
        this.uploadFile = null;
        this.uploadPreview = null;
        this.uploadCaption = '';
    }

    closeUploadModal() {
        this.showUploadModal = false;
        this.uploadFile = null;
        this.uploadPreview = null;
        this.uploadCaption = '';
    }

    onGalleryFileSelect(event: any) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.uploadFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.uploadPreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    uploadGalleryImage() {
        if (!this.uploadFile || !this.currentUser?.id) return;

        this.galleryLoading = true;
        this.uploadPercent = 0;
        this.galleryService.uploadImage(this.currentUser.id, this.uploadFile, this.uploadCaption).subscribe({
            next: (event) => {
                if (event.type === 'progress') {
                    this.uploadPercent = event.progress;
                } else if (event.type === 'response') {
                    const res = event.body;
                    if (res.success && res.image) {
                        this.galleryImages.unshift(res.image);
                    }
                    this.closeUploadModal();
                    this.galleryLoading = false;
                    this.uploadPercent = 0;
                }
            },
            error: (err) => {
                console.error('Failed to upload image', err);
                alert(this.languageService.translate('GALLERY.UPLOAD_ERROR'));
                this.galleryLoading = false;
                this.uploadPercent = 0;
            }
        });
    }

    viewImage(image: GalleryImage) {
        this.viewingImage = image;
        this.showViewModal = true;
    }

    closeViewModal() {
        this.showViewModal = false;
        this.viewingImage = null;
    }

    reactToImage(image: GalleryImage, type: 'like' | 'dislike', event?: Event) {
        if (event) event.stopPropagation();
        if (!this.currentUser?.id) return;

        this.galleryService.react(this.currentUser.id, image.id, type).subscribe({
            next: (res) => {
                image.likes_count = res.likes_count;
                image.dislikes_count = res.dislikes_count;
                image.user_liked = type === 'like' && !image.user_liked;
                image.user_disliked = type === 'dislike' && !image.user_disliked;
            },
            error: (err) => console.error('Failed to react', err)
        });
    }

    deleteGalleryImage(image: GalleryImage, event: Event) {
        event.stopPropagation();
        if (!this.currentUser?.id) return;
        if (!confirm(this.languageService.translate('GALLERY.DELETE_CONFIRM'))) return;

        this.galleryService.deleteImage(this.currentUser.id, image.id).subscribe({
            next: () => {
                this.galleryImages = this.galleryImages.filter(img => img.id !== image.id);
            },
            error: (err) => {
                console.error('Failed to delete image', err);
                alert(this.languageService.translate('GALLERY.DELETE_ERROR'));
            }
        });
    }

    getGalleryImageUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${this.api.phpBaseUrl}${path}`;
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.stopTelegramPolling();
    }
}
