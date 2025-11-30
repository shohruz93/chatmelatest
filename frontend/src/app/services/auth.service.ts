import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { FirebaseService } from './firebase.service';
import { BehaviorSubject, tap, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

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
            this.userSubject.next(JSON.parse(savedUser));
        }

        // Listen to Firebase auth state changes
        this.firebaseService.getAuthState().subscribe(user => {
            if (user) {
                console.log('Firebase user logged in:', user);
            } else {
                console.log('Firebase user logged out');
            }
        });
    }

    async loginWithGoogle() {
        try {
            // Sign in with Firebase and get Google ID Token
            const idToken = await this.firebaseService.signInWithGoogle();

            if (!idToken) {
                throw new Error('Failed to get Google ID Token');
            }

            // Send to your backend API for verification and session creation
            const request$ = this.api.post('/auth/google', { token: idToken }).pipe(
                tap((response: any) => {
                    if (response.token) {
                        localStorage.setItem('token', response.token);
                        localStorage.setItem('user', JSON.stringify(response.user));
                        this.userSubject.next(response.user);

                        // Check if user needs onboarding
                        if (response.user.needsOnboarding) {
                            this.router.navigate(['/onboarding']);
                        } else {
                            this.router.navigate(['/chat']);
                        }
                    }
                })
            );

            return await firstValueFrom(request$);
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
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
}
