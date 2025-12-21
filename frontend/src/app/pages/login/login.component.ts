import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    isDarkMode = signal(document.documentElement.getAttribute('data-theme') === 'dark');
    isLoading = signal(false);
    error = signal<string | null>(null);

    constructor(private auth: AuthService) { }

    toggleTheme() {
        const newTheme = this.isDarkMode() ? 'light' : 'dark';
        this.isDarkMode.set(!this.isDarkMode());
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    async login() {
        this.isLoading.set(true);
        this.error.set(null);

        try {
            await this.auth.loginWithGoogle();
        } catch (error: any) {
            console.error('Login failed:', error);
            this.error.set(error.message || 'Failed to sign in. Please try again.');
        } finally {
            this.isLoading.set(false);
        }
    }
}
