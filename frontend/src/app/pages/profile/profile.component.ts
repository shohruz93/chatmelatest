import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import countries from 'world-countries';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent, RouterLink],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    currentUser: any; // The logged-in user
    profileUser: any; // The user whose profile is being viewed

    bio: string = '';
    interests: any[] = [];
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

    // Rating & Comment Inputs
    newRating: number = 0;
    newComment: string = '';
    replyContent: { [key: number]: string } = {};
    showReplyInput: { [key: number]: boolean } = {};
    showReplies: { [key: number]: boolean } = {};

    genderOptions = [
        { value: '', label: 'Prefer not to say' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
    ];

    languages = [
        { code: 'en', name: 'English' },
        { code: 'tj', name: 'Tajik' },
        { code: 'ru', name: 'Russian' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' }
    ];

    countries: { name: string, code: string, flag: string }[] = [];

    isDarkMode = signal(false);

    ngOnInit() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.isDarkMode.set(savedTheme === 'dark');

        this.countries = countries.map(country => ({
            name: country.name.common,
            code: country.cca2,
            flag: country.flag
        })).sort((a, b) => a.name.localeCompare(b.name));

        this.currentUser = this.auth.currentUserValue;

        this.route.params.subscribe(params => {
            const userId = params['id'] ? +params['id'] : this.currentUser?.id;

            if (userId) {
                this.isOwnProfile = (userId === this.currentUser?.id);
                this.loadProfile(userId);

                if (!this.isOwnProfile && this.currentUser) {
                    this.api.recordView(this.currentUser.id, userId).subscribe();
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
                this.interests = data.interests || [];
                this.gender = data.gender || '';
                this.location = data.location || '';

                this.nativeLanguages = data.native_language ? data.native_language.split(',') : [];
                this.learningLanguages = data.learning_language ? data.learning_language.split(',') : [];

                if (data.avatar) {
                    if (data.avatar.startsWith('http')) {
                        this.profileUser.avatar = data.avatar;
                    } else {
                        this.profileUser.avatar = `http://localhost:8000${data.avatar}`;
                    }
                }

                this.ratings = {
                    average: data.rating || 0,
                    count: data.rating_count || 0
                };

                this.loadComments(userId);
                this.loading = false;
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
        const trimmed = this.newInterest.trim();
        if (trimmed && !this.interests.find(i => (i.name || i) === trimmed)) {
            this.interests.push({ name: trimmed });
            this.newInterest = '';
        }
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
        const lang = this.languages.find(l => l.code === code);
        return lang ? lang.name : code;
    }

    saveProfile() {
        this.loading = true;
        const formData = new FormData();
        formData.append('bio', this.bio);
        formData.append('gender', this.gender);
        formData.append('location', this.location);
        formData.append('native_language', this.nativeLanguages.join(','));
        formData.append('learning_language', this.learningLanguages.join(','));

        this.interests.forEach((interest, index) => {
            const interestValue = interest.id || interest.name || interest;
            formData.append(`interests[${index}]`, interestValue);
        });

        if (this.selectedFile) {
            formData.append('avatar', this.selectedFile);
        }

        this.api.post(`/profile?userId=${this.currentUser.id}`, formData).subscribe({
            next: (res: any) => {
                this.isEditing = false;
                this.selectedFile = null;
                this.previewUrl = null;

                if (res.avatar) {
                    const avatarUrl = 'http://localhost:8000' + res.avatar;
                    this.currentUser.avatar = avatarUrl;
                    // Update auth service to persist the avatar in localStorage
                    this.auth.updateUser({ avatar: avatarUrl });
                }

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
                this.loadProfile(this.profileUser.id); // Reload to get new stats and comments
            },
            error: (err) => alert('Failed to submit rating')
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

    getCountryFlag(countryName: string): string {
        const country = this.countries.find(c => c.name === countryName);
        return country ? country.flag : '';
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
}
