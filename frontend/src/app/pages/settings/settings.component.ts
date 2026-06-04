import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, ConfirmDialogComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
    public languageService = inject(LanguageService);
    private auth = inject(AuthService);
    private router = inject(Router);

    isDarkMode = signal(false);
    soundEnabled = signal(true);
    nsfwAllowed = signal(false);
    showLogoutDialog = false;

    ngOnInit() {
        // Load theme
        const theme = localStorage.getItem('theme') || 'dark';
        this.isDarkMode.set(theme === 'dark');

        // Load sound setting
        const sound = localStorage.getItem('sound_enabled');
        this.soundEnabled.set(sound === null ? true : sound === 'true');

        // Load 18+ setting
        const nsfw = localStorage.getItem('allow_nsfw_content');
        this.nsfwAllowed.set(nsfw === 'true');
    }

    toggleTheme() {
        const newTheme = this.isDarkMode() ? 'light' : 'dark';
        this.isDarkMode.set(!this.isDarkMode());
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    toggleSound() {
        const newValue = !this.soundEnabled();
        this.soundEnabled.set(newValue);
        localStorage.setItem('sound_enabled', newValue ? 'true' : 'false');
    }

    toggleNsfw() {
        const newValue = !this.nsfwAllowed();
        this.nsfwAllowed.set(newValue);
        localStorage.setItem('allow_nsfw_content', newValue ? 'true' : 'false');
    }

    setLanguage(lang: string) {
        this.languageService.setLanguage(lang);
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

    goBack() {
        this.router.navigate(['/dashboard']);
    }
}
