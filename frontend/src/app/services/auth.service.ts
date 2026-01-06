import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { FirebaseService } from './firebase.service';
import { BehaviorSubject, tap, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private userSubject = new BehaviorSubject<any>(null);
    user$ = this.userSubject.asObservable();

    constructor(
        private api: ApiService,
        private router: Router,
        private firebaseService: FirebaseService
    ) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            this.userSubject.next(user);
            this.refreshProfile(user.id);
        }

        // Listen to Firebase auth state changes
        this.firebaseService.getAuthState().subscribe(user => {
            // Firebase auth state changed
        });
    }

    async loginWithGoogle() {
        try {
            // Sign in with Firebase and get Google ID Token
            const loginResult = await this.firebaseService.signInWithGoogle();
            const idToken = loginResult.idToken;

            if (!idToken) {
                throw new Error('Failed to get Google ID Token');
            }

            // Send to your backend API for verification and session creation
            const request$ = this.api.post('/auth/google', {
                token: idToken,
                profile: loginResult.profile
            }).pipe(
                tap((response: any) => {
                    if (response.token) {
                        localStorage.setItem('token', response.token);
                        localStorage.setItem('user', JSON.stringify(response.user));
                        this.userSubject.next(response.user);

                        // Check if user needs onboarding
                        if (response.user.needsOnboarding) {
                            this.router.navigate(['/onboarding']);
                        } else {
                            this.router.navigate(['/dashboard/profile']);
                        }
                    }
                })
            );

            return await firstValueFrom(request$);
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
            if (Capacitor.isNativePlatform()) {
                alert('Auth Error: ' + (error.message || JSON.stringify(error)));
            }
            throw error;
        }
    }

    async requestEmailCode(email: string) {
        try {
            return await firstValueFrom(this.api.post('/auth/send-code', { email }));
        } catch (error: any) {
            console.error('Request Email Code Error:', error);
            throw error;
        }
    }

    async verifyEmailCode(email: string, code: string) {
        try {
            const request$ = this.api.post('/auth/verify-code', { email, code }).pipe(
                tap((response: any) => {
                    if (response.token) {
                        localStorage.setItem('token', response.token);
                        localStorage.setItem('user', JSON.stringify(response.user));
                        this.userSubject.next(response.user);

                        if (response.user.needsOnboarding) {
                            this.router.navigate(['/onboarding']);
                        } else {
                            this.router.navigate(['/dashboard/profile']);
                        }
                    }
                })
            );

            return await firstValueFrom(request$);
        } catch (error: any) {
            console.error('Verify Email Code Error:', error);
            if (Capacitor.isNativePlatform()) {
                alert('Auth Error: ' + (error.message || JSON.stringify(error)));
            }
            throw error;
        }
    }

    async logout() {
        await this.firebaseService.signOut();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.userSubject.next(null);
        this.router.navigate(['/login']);
    }

    get currentUserValue() {
        return this.userSubject.value;
    }

    get firebaseUser() {
        return this.firebaseService.getCurrentUser();
    }

    updateUser(userData: any) {
        const updatedUser = { ...this.userSubject.value, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.userSubject.next(updatedUser);
    }
    refreshProfile(userId: number) {
        this.api.get(`/profile?userId=${userId}`).subscribe({
            next: (profile: any) => {
                if (profile) {
                    this.updateUser(profile);
                }
            },
            error: (err) => console.error('Failed to refresh profile', err)
        });
    }
}
