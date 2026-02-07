import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CountryService } from '../../services/country.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { lastValueFrom } from 'rxjs';

@Component({
    selector: 'app-profile-completion-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './profile-completion-modal.component.html',
    styleUrls: ['./profile-completion-modal.component.css']
})
export class ProfileCompletionModalComponent {
    @Output() completionEvent = new EventEmitter<void>();

    private api = inject(ApiService);
    private auth = inject(AuthService);
    private countryService = inject(CountryService);

    selectedGender: string = '';
    selectedNativeLanguage: string = '';
    selectedLearningLanguage: string = '';

    showNativeLanguageDropdown = false;
    showLearningLanguageDropdown = false;

    isSubmitting = signal(false);
    errorMessage = signal<string>('');

    genderOptions = [
        { value: 'male', label: 'EXPLORE_PAGE.MALE' },
        { value: 'female', label: 'EXPLORE_PAGE.FEMALE' }
    ];

    get languageOptions() {
        return this.countryService.getLanguageOptions(false);
    }

    get isFormValid(): boolean {
        return !!(this.selectedGender && this.selectedNativeLanguage && this.selectedLearningLanguage);
    }

    toggleNativeLanguageDropdown() {
        this.showNativeLanguageDropdown = !this.showNativeLanguageDropdown;
        this.showLearningLanguageDropdown = false;
    }

    toggleLearningLanguageDropdown() {
        this.showLearningLanguageDropdown = !this.showLearningLanguageDropdown;
        this.showNativeLanguageDropdown = false;
    }

    selectNativeLanguage(value: string) {
        this.selectedNativeLanguage = value;
        this.showNativeLanguageDropdown = false;
    }

    selectLearningLanguage(value: string) {
        this.selectedLearningLanguage = value;
        this.showLearningLanguageDropdown = false;
    }

    getSelectedNativeLanguageLabel(): string {
        const option = this.languageOptions.find(o => o.value === this.selectedNativeLanguage);
        return option?.label || 'Select Native Language';
    }

    getSelectedNativeLanguageFlag(): string {
        const option = this.languageOptions.find(o => o.value === this.selectedNativeLanguage);
        return option?.flagUrl || '';
    }

    getSelectedLearningLanguageLabel(): string {
        const option = this.languageOptions.find(o => o.value === this.selectedLearningLanguage);
        return option?.label || 'Select Learning Language';
    }

    getSelectedLearningLanguageFlag(): string {
        const option = this.languageOptions.find(o => o.value === this.selectedLearningLanguage);
        return option?.flagUrl || '';
    }

    async submitProfile() {
        if (!this.isFormValid || this.isSubmitting()) {
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set('');

        try {
            const currentUser = this.auth.currentUserValue;
            if (!currentUser) {
                throw new Error('User not found');
            }

            const updateData = {
                gender: this.selectedGender,
                native_language: this.selectedNativeLanguage,
                learning_language: this.selectedLearningLanguage
            };

            // Use POST /profile with userId query parameter
            await lastValueFrom(this.api.post(`/profile?userId=${currentUser.id}`, updateData));

            // Update local user state
            this.auth.updateUser({
                gender: this.selectedGender,
                native_language: this.selectedNativeLanguage,
                learning_language: this.selectedLearningLanguage
            });

            // Emit completion event
            this.completionEvent.emit();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            this.errorMessage.set(error.message || 'Failed to update profile. Please try again.');
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
