import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import countries from 'world-countries';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);

    user: any;
    bio: string = '';
    interests: any[] = [];
    ratings: any = { average: 0, count: 0 };
    loading: boolean = false;
    isEditing: boolean = false;
    selectedFile: File | null = null;
    previewUrl: string | null = null;
    newInterest: string = '';
    showLogoutDialog: boolean = false;
    gender: string = '';
    location: string = '';
    nativeLanguages: string[] = [];
    learningLanguages: string[] = [];

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

        // Process world-countries data to get name, code, and flag
        this.countries = countries.map(country => ({
            name: country.name.common,
            code: country.cca2,
            flag: country.flag
        })).sort((a, b) => a.name.localeCompare(b.name));

        this.user = this.auth.currentUserValue;
        if (this.user) {
            this.loadProfile();
        }
    }

    loadProfile() {
        this.loading = true;
        this.api.get(`/profile?userId=${this.user.id}`).subscribe({
            next: (data) => {
                this.bio = data.bio || '';
                this.interests = data.interests || [];
                this.gender = data.gender || '';
                this.location = data.location || '';

                // Parse comma-separated strings into arrays
                this.nativeLanguages = data.native_language ? data.native_language.split(',') : [];
                this.learningLanguages = data.learning_language ? data.learning_language.split(',') : [];

                // Handle avatar
                if (data.avatar) {
                    // If it's a full URL (e.g. Google photo), use it. 
                    // Otherwise prepend API URL if it's a relative path
                    if (data.avatar.startsWith('http')) {
                        this.user.avatar = data.avatar;
                    } else {
                        this.user.avatar = `http://localhost:8000${data.avatar}`;
                    }
                }

                this.ratings = {
                    average: data.rating || 0,
                    count: data.rating_count || 0
                };
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading profile', err);
                this.loading = false;
            }
        });
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
        if (!this.isEditing) {
            this.loadProfile();
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

        // Reset select
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

        // Join arrays into comma-separated strings
        formData.append('native_language', this.nativeLanguages.join(','));
        formData.append('learning_language', this.learningLanguages.join(','));

        this.interests.forEach((interest, index) => {
            const interestValue = interest.id || interest.name || interest;
            formData.append(`interests[${index}]`, interestValue);
        });

        if (this.selectedFile) {
            formData.append('avatar', this.selectedFile);
        }

        this.api.post(`/profile?userId=${this.user.id}`, formData).subscribe({
            next: (res: any) => {
                this.isEditing = false;
                this.selectedFile = null;
                this.previewUrl = null;

                if (res.avatar) {
                    this.user.avatar = 'http://localhost:8000' + res.avatar;
                }

                this.loadProfile();
                alert('Profile updated successfully!');
            },
            error: (err) => {
                console.error('Error updating profile', err);
                this.loading = false;
                alert('Failed to save profile. Please try again.');
            }
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
